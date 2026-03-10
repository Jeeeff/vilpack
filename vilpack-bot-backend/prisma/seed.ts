
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Clean up existing data
  console.log('🗑️  Cleaning up old data...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.adminUser.deleteMany({});
  
  // 2. Create Admin User
  const adminPassword = process.env.ADMIN_PASSWORD || 'vilpack2026';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  await prisma.adminUser.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      role: 'MASTER'
    }
  });
  console.log('✅ Admin user created: admin /', adminPassword);

  // 3. Create/Update Store
  const store = await prisma.store.upsert({
    where: { slug: 'vilpack' },
    update: {},
    create: {
      name: 'Vilpack',
      slug: 'vilpack',
      phoneNumber: '5511999999999',
    },
  });
  console.log('✅ Store ready:', store.name);

  // 3. Define new Categories and Products (Phase 1 Requirements)
  const catalog = [
    {
      category: 'Sacolas',
      products: [
        { 
          name: 'Sacola Kraft Pequena', 
          price: 18.00, 
          description: 'Pacote com 50un. Ideal para delivery e pequenos objetos.',
          imageUrl: null
        },
        { 
          name: 'Sacola Kraft Média', 
          price: 24.50, 
          description: 'Pacote com 50un. Tamanho padrão para lojas.',
          imageUrl: null
        },
        { 
          name: 'Sacola Kraft Grande', 
          price: 32.00, 
          description: 'Pacote com 50un. Alta resistência para volumes maiores.',
          imageUrl: null
        }
      ]
    },
    {
      category: 'Sacos de Pão',
      products: [
        { 
          name: 'Saco de Pão 1kg', 
          price: 25.00, 
          description: 'Pacote com 500un. Papel kraft pardo, ideal para padarias.',
          imageUrl: null
        },
        { 
          name: 'Saco de Pão 3kg', 
          price: 35.00, 
          description: 'Pacote com 500un. Resistente e higiênico.',
          imageUrl: null
        }
      ]
    },
    {
      category: 'Papel Acoplado',
      products: [
        { 
          name: 'Papel Acoplado Térmico', 
          price: 65.00, 
          description: 'Caixa com 500 folhas. Mantém a temperatura do alimento.',
          imageUrl: null
        },
        { 
          name: 'Papel Acoplado Estampado', 
          price: 68.00, 
          description: 'Caixa com 500 folhas. Design moderno para lanches.',
          imageUrl: null
        }
      ]
    },
    {
      category: 'Bobinas',
      products: [
        { 
          name: 'Bobina Picotada 30x40', 
          price: 18.00, 
          description: 'Rolo com 500 sacos. Prática para supermercados e hortifruti.',
          imageUrl: null
        },
        { 
          name: 'Bobina Fundo Estrela', 
          price: 22.00, 
          description: 'Rolo com 300 sacos. Fundo reforçado para maior segurança.',
          imageUrl: null
        }
      ]
    }
  ];

  // 4. Insert Data
  for (const group of catalog) {
    const category = await prisma.category.create({
      data: {
        name: group.category,
        storeId: store.id,
      },
    });
    console.log(`📂 Category created: ${group.category}`);

    for (const prod of group.products) {
      await prisma.product.create({
        data: {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          categoryId: category.id,
          imageUrl: prod.imageUrl,
          image: prod.imageUrl, // Backup field
          active: true,
        },
      });
    }
  }
  
  // 5. Create Sample Order for Reorder Testing (Needed for future steps, keeping it minimal)
  const allProducts = await prisma.product.findMany();
  if (allProducts.length > 0) {
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        total: 100.00, 
        status: 'completed',
        items: {
          create: [
            {
              productId: allProducts[0].id,
              quantity: 5,
              price: allProducts[0].price,
            },
          ],
        },
      },
    });
    console.log(`✅ Sample Order created for testing`);
  }

  console.log('✅ Seed Phase 1 completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
