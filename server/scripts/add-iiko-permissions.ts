#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addIikoPermissions() {
  try {
    console.log('🔧 Adding iiko permissions...')

    // Add iiko.read permission
    const iikoReadPerm = await prisma.permission.upsert({
      where: { name: 'iiko.read' },
      update: {},
      create: {
        id: 'iiko_read_perm',
        name: 'iiko.read',
        description: 'Доступ к чтению данных iiko'
      }
    })
    console.log('✅ Added iiko.read permission:', iikoReadPerm.id)

    // Add iiko.write permission
    const iikoWritePerm = await prisma.permission.upsert({
      where: { name: 'iiko.write' },
      update: {},
      create: {
        id: 'iiko_write_perm',
        name: 'iiko.write',
        description: 'Доступ к записи данных iiko'
      }
    })
    console.log('✅ Added iiko.write permission:', iikoWritePerm.id)

    // Get ADMIN role
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    })

    if (!adminRole) {
      throw new Error('ADMIN role not found')
    }

    console.log('✅ Found ADMIN role:', adminRole.id)

    // Add iiko.read permission to ADMIN role
    const iikoReadRolePerm = await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: iikoReadPerm.id
        }
      },
      update: {},
      create: {
        id: 'iiko_read_role_perm',
        roleId: adminRole.id,
        permissionId: iikoReadPerm.id
      }
    })
    console.log('✅ Added iiko.read permission to ADMIN role:', iikoReadRolePerm.id)

    // Add iiko.write permission to ADMIN role
    const iikoWriteRolePerm = await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: iikoWritePerm.id
        }
      },
      update: {},
      create: {
        id: 'iiko_write_role_perm',
        roleId: adminRole.id,
        permissionId: iikoWritePerm.id
      }
    })
    console.log('✅ Added iiko.write permission to ADMIN role:', iikoWriteRolePerm.id)

    console.log('🎉 All iiko permissions added successfully!')

  } catch (error) {
    console.error('❌ Error adding iiko permissions:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addIikoPermissions()
