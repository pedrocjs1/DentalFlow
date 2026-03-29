/**
 * Cambia el password del Super Admin.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." npx tsx apps/api/scripts/change-admin-password.ts <email> <nuevo-password>
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Uso: npx tsx apps/api/scripts/change-admin-password.ts <email> <nuevo-password>");
    process.exit(1);
  }

  if (newPassword.length < 10) {
    console.error("Error: el password debe tener al menos 10 caracteres.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      console.error(`No se encontro AdminUser con email: ${email}`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    console.log(`Password actualizado para ${admin.email} (${admin.name})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
