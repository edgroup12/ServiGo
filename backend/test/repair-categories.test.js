const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    CATEGORY_DEFINITIONS,
    normalizeText,
    workerMatchesCategory,
    findDeterministicCategory,
    parseOptions
} = require('../repair-categories');

describe('category repair matching', () => {
    it('defines the six canonical categories', () => {
        assert.deepEqual(
            CATEGORY_DEFINITIONS.map(({ name }) => name),
            [
                'Plumber',
                'Electrician',
                'AC Service',
                'Painter',
                'Carpenter',
                'House Cleaner'
            ]
        );
    });

    it('normalizes case and repeated whitespace', () => {
        assert.equal(normalizeText('  AC   SERVICE '), 'ac service');
    });

    it('matches an exact category skill or a category-prefixed skill', () => {
        assert.equal(
            workerMatchesCategory({ skills: ['AC Service'], bio: '' }, 'AC Service'),
            true
        );
        assert.equal(
            workerMatchesCategory({ skills: ['AC Service Repair'], bio: '' }, 'AC Service'),
            true
        );
    });

    it('matches the canonical professional bio format', () => {
        const match = findDeterministicCategory({
            skills: [],
            bio: 'Professional Plumber with over 5 years of experience.'
        });

        assert.equal(match.name, 'Plumber');
    });

    it('refuses to choose when multiple category signals exist', () => {
        const match = findDeterministicCategory({
            skills: ['AC Service', 'Painter'],
            bio: ''
        });

        assert.equal(match, null);
    });

    it('requires an explicit apply flag before allowing writes', () => {
        assert.deepEqual(parseOptions([]), { apply: false });
        assert.deepEqual(parseOptions(['--apply']), { apply: true });
    });
});
