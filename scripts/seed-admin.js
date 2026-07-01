const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log("=== Creador de Administrador para Coffee Shop ===");
  
  try {
    let username = await askQuestion("Introduce el nombre de usuario de admin [admin]: ");
    username = username.trim() || "admin";
    
    let password = await askQuestion("Introduce la contraseña de admin [admin123]: ");
    password = password.trim() || "admin123";
    
    if (username.length < 3) {
      console.error("❌ El nombre de usuario debe tener al menos 3 caracteres.");
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.error("❌ La contraseña debe tener al menos 6 caracteres.");
      process.exit(1);
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Verificar si ya existe ese admin
    const existing = await prisma.admin.findUnique({
      where: { username }
    });
    
    if (existing) {
      const confirm = await askQuestion(`⚠️ El usuario '${username}' ya existe. ¿Quieres actualizar su contraseña? (s/n) [n]: `);
      if (confirm.toLowerCase().trim() !== 's') {
        console.log("Operación cancelada.");
        process.exit(0);
      }
      
      await prisma.admin.update({
        where: { username },
        data: { password: hashedPassword }
      });
      console.log(`\n✅ Contraseña para el administrador '${username}' actualizada con éxito.`);
    } else {
      await prisma.admin.create({
        data: {
          username,
          password: hashedPassword
        }
      });
      console.log(`\n✅ Administrador '${username}' creado con éxito.`);
    }
  } catch (error) {
    console.error("❌ Error al ejecutar el script de inicialización:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
