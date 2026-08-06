require('dotenv').config();

const mongoose = require('mongoose');
const connectDatabase = require('./db');
const Category = require('./models/Category');
const User = require('./models/User');

const CATEGORY_DEFINITIONS = Object.freeze([
    { name: 'Plumber', nameBn: 'প্লাম্বার', icon: 'Droplet' },
    { name: 'Electrician', nameBn: 'ইলেকট্রিশিয়ান', icon: 'Zap' },
    { name: 'AC Service', nameBn: 'এসি সার্ভিস', icon: 'ThermometerSnowflake' },
    { name: 'Painter', nameBn: 'পেইন্টার', icon: 'Paintbrush' },
    { name: 'Carpenter', nameBn: 'কাঠমিস্ত্রি', icon: 'Hammer' },
    { name: 'House Cleaner', nameBn: 'ক্লিনার', icon: 'Sparkles' }
]);

const normalizeText = (value) => String(value || '')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ');

const workerMatchesCategory = (worker, categoryName) => {
    const normalizedCategory = normalizeText(categoryName);
    const skills = Array.isArray(worker.skills) ? worker.skills : [];
    const skillMatch = skills.some((skill) => {
        const normalizedSkill = normalizeText(skill);
        return normalizedSkill === normalizedCategory
            || normalizedSkill.startsWith(`${normalizedCategory} `);
    });

    const normalizedBio = normalizeText(worker.bio);
    const bioMatch = normalizedBio === `professional ${normalizedCategory}`
        || normalizedBio.startsWith(`professional ${normalizedCategory} `);

    return skillMatch || bioMatch;
};

const findDeterministicCategory = (worker, categories = CATEGORY_DEFINITIONS) => {
    const matches = categories.filter(({ name }) => workerMatchesCategory(worker, name));
    return matches.length === 1 ? matches[0] : null;
};

const parseOptions = (args = process.argv.slice(2)) => ({
    apply: args.includes('--apply')
});

const previewRepair = async () => {
    const existingCategories = await Category.find({}).lean();
    const existingNames = new Set(existingCategories.map(({ name }) => normalizeText(name)));
    const missingCategories = CATEGORY_DEFINITIONS.filter(
        ({ name }) => !existingNames.has(normalizeText(name))
    );
    const unlinkedWorkers = await User.find({
        role: 'worker',
        $or: [{ category: null }, { category: { $exists: false } }]
    }).select('_id name email skills bio').lean();
    const workerMatches = unlinkedWorkers.map((worker) => ({
        worker,
        category: findDeterministicCategory(worker)
    }));

    return {
        existingCategoryCount: existingCategories.length,
        missingCategories,
        workerMatches,
        linkableWorkers: workerMatches.filter(({ category }) => category),
        ambiguousWorkers: workerMatches.filter(({ category }) => !category)
    };
};

const applyRepair = async () => {
    const existingCategories = await Category.find({}).lean();
    const existingNames = new Set(
        existingCategories.map(({ name }) => normalizeText(name))
    );
    const missingCategories = CATEGORY_DEFINITIONS.filter(
        ({ name }) => !existingNames.has(normalizeText(name))
    );
    const categoryUpsertResults = [];

    for (const definition of missingCategories) {
        const result = await Category.updateOne(
            { name: definition.name },
            { $setOnInsert: definition },
            { upsert: true }
        );
        categoryUpsertResults.push(result);
    }

    const categories = await Category.find({}).lean();
    const categoryIdsByName = new Map(
        categories.map(({ _id, name }) => [normalizeText(name), _id])
    );
    const unlinkedWorkers = await User.find({
        role: 'worker',
        $or: [{ category: null }, { category: { $exists: false } }]
    }).select('_id name email skills bio').lean();
    const workerUpdates = [];
    const skippedWorkers = [];

    for (const worker of unlinkedWorkers) {
        const match = findDeterministicCategory(worker);
        const categoryId = match && categoryIdsByName.get(normalizeText(match.name));

        if (!categoryId) {
            skippedWorkers.push(worker);
            continue;
        }

        const result = await User.updateOne(
            {
                _id: worker._id,
                role: 'worker',
                $or: [{ category: null }, { category: { $exists: false } }]
            },
            { $set: { category: categoryId } }
        );

        if (result.modifiedCount === 1) {
            workerUpdates.push({ worker, category: match });
        }
    }

    return {
        insertedCategories: categoryUpsertResults.reduce(
            (total, result) => total + (result.upsertedCount || 0),
            0
        ),
        linkedWorkers: workerUpdates,
        skippedWorkers
    };
};

const printWorker = ({ worker, category }) => {
    const identity = worker.email || worker.name || String(worker._id);
    return category ? `${identity} -> ${category.name}` : `${identity} -> no unique match`;
};

const run = async () => {
    const { apply } = parseOptions();

    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is required. Add valid credentials to backend/.env first.');
    }

    await connectDatabase(process.env.MONGODB_URI);

    if (!apply) {
        const preview = await previewRepair();
        console.log('DRY RUN: no database records were changed.');
        console.log(`Existing categories: ${preview.existingCategoryCount}`);
        console.log(`Missing canonical categories: ${preview.missingCategories.map(({ name }) => name).join(', ') || 'none'}`);
        console.log(`Workers eligible for deterministic linking: ${preview.linkableWorkers.length}`);
        preview.workerMatches.forEach((match) => console.log(`  ${printWorker(match)}`));
        console.log('Run "npm run repair:categories:apply" only after reviewing this preview.');
        return;
    }

    const result = await applyRepair();
    console.log('Category repair completed without deleting or replacing existing records.');
    console.log(`Categories inserted: ${result.insertedCategories}`);
    console.log(`Workers linked: ${result.linkedWorkers.length}`);
    result.linkedWorkers.forEach((match) => console.log(`  ${printWorker(match)}`));
    console.log(`Workers skipped because no unique deterministic match exists: ${result.skippedWorkers.length}`);
};

if (require.main === module) {
    run()
        .catch((error) => {
            console.error(`Category repair failed: ${error.message}`);
            process.exitCode = 1;
        })
        .finally(async () => {
            await mongoose.connection.close().catch(() => { });
        });
}

module.exports = {
    CATEGORY_DEFINITIONS,
    normalizeText,
    workerMatchesCategory,
    findDeterministicCategory,
    parseOptions,
    previewRepair,
    applyRepair
};
