const Category = require('./models/Category');
const User = require('./models/User');
const Booking = require('./models/Booking');

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Booking.deleteMany({});
    console.log('Database cleared for fresh seed.');

    // 1. Create Categories
    const categories = await Category.insertMany([
      { name: 'Plumber', nameBn: 'প্লাম্বার', icon: 'Droplet' },
      { name: 'Electrician', nameBn: 'ইলেকট্রিশিয়ান', icon: 'Zap' },
      { name: 'AC Service', nameBn: 'এসি সার্ভিস', icon: 'ThermometerSnowflake' },
      { name: 'Painter', nameBn: 'পেইন্টার', icon: 'Paintbrush' },
      { name: 'Carpenter', nameBn: 'কাঠমিস্ত্রি', icon: 'Hammer' },
      { name: 'House Cleaner', nameBn: 'ক্লিনার', icon: 'Sparkles' }
    ]);

    console.log('Categories seeded.');

    // 2. Create Dummy Customer
    const customer = await User.create({
      name: 'Rahim Uddin',
      email: 'rahim@servigo.com',
      password: 'password123',
      role: 'customer',
      phone: '01711000000',
    });

    // 3. Define 24 Workers (4 per category: 2 available, 2 busy)
    const workersData = [];
    const firstNames = ['Abdul', 'Kamal', 'Jamal', 'Shafiq', 'Mokbul', 'Nasir', 'Hasina', 'Ripon', 'Sajib', 'Sumon', 'Karim', 'Rahat', 'Selim', 'Arif', 'Babul', 'Faruk', 'Jashim', 'Kabir', 'Mizan', 'Nurun', 'Rafiq', 'Sultan', 'Tareq', 'Zakir'];
    const lastNames = ['Kalam', 'Hossain', 'Islam', 'Ahmed', 'Uddin', 'Begum', 'Mia', 'Hasan', 'Khan', 'Sheikh', 'Ali', 'Chowdhury', 'Talukder', 'Molla', 'Sarker', 'Bhuiyan', 'Munshi', 'Patwary', 'Dewan', 'Gazi', 'Majumder', 'Howlader', 'Sikder', 'Biswas'];

    categories.forEach((cat, catIdx) => {
      for (let i = 0; i < 4; i++) {
        const workerIndex = (catIdx * 4) + i;
        const isAvailable = i % 2 === 0; // 0, 2 are true | 1, 3 are false
        
        workersData.push({
          name: `${firstNames[workerIndex]} ${lastNames[workerIndex]}`,
          email: `worker${workerIndex + 1}@servigo.com`,
          password: 'password123',
          role: 'worker',
          phone: `01811000${(workerIndex + 10).toString().padStart(3, '0')}`,
          category: cat._id,
          bio: `Professional ${cat.name} with over ${5 + i} years of experience in high-quality service delivery.`,
          skills: [`${cat.name} Repair`, 'Maintenance', 'Installation'],
          pricePerHour: 300 + (Math.floor(Math.random() * 500)),
          rating: (4.0 + (Math.random() * 1.0)).toFixed(1),
          reviewCount: 20 + Math.floor(Math.random() * 200),
          isAvailable: isAvailable,
          distance: (1.0 + (Math.random() * 8.0)).toFixed(1),
          photoUrl: `https://i.pravatar.cc/150?img=${workerIndex + 10}`
        });
      }
    });

    // Seed workers using a loop to trigger pre-save hooks
    const workers = [];
    for (const data of workersData) {
      const w = await User.create(data);
      workers.push(w);
    }
    console.log(`${workers.length} Workers seeded.`);

    // 4. Create Dummy Bookings for the first customer
    const bookingsData = [
      {
        customer: customer._id,
        worker: workers[0]._id,
        date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
        address: 'House 12, Road 5, Dhanmondi, Dhaka',
        description: 'Need urgent help with service.',
        status: 'pending',
        estimatedPrice: workers[0].pricePerHour,
        paymentMethod: 'Cash'
      },
      {
        customer: customer._id,
        worker: workers[1]._id,
        date: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
        address: 'Flat 4B, Building 2, Gulshan 1, Dhaka',
        description: 'Regular maintenance work.',
        status: 'completed',
        estimatedPrice: workers[1].pricePerHour * 2,
        paymentMethod: 'bKash'
      }
    ];

    await Booking.insertMany(bookingsData);
    console.log('Bookings seeded.');

    console.log('--- Seeding Completed ---');
    console.log(`Total Workers: ${workers.length}`);

  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = seedDatabase;
