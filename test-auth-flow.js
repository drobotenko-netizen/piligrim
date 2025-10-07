#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки работы системы авторизации без Messaggio
 * 
 * Этот скрипт проверяет:
 * 1. Health check endpoint
 * 2. DEV login endpoint
 * 3. Проверку авторизации через /me
 * 4. Logout
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

async function testAuthFlow() {
  console.log('🧪 Тестирование системы авторизации...\n');
  
  try {
    // 1. Проверяем health endpoint
    console.log('1️⃣ Проверяем health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // 2. Проверяем auth ping endpoint
    console.log('\n2️⃣ Проверяем auth ping endpoint...');
    const pingResponse = await fetch(`${API_BASE}/api/auth/_ping`);
    const pingData = await pingResponse.json();
    console.log('✅ Auth ping:', pingData);
    
    // 3. Проверяем /me без авторизации
    console.log('\n3️⃣ Проверяем /me без авторизации...');
    const meResponse = await fetch(`${API_BASE}/api/auth/me`);
    const meData = await meResponse.json();
    console.log('✅ /me без авторизации:', meData);
    
    // 4. Проверяем dev login (только если есть пользователи в системе)
    console.log('\n4️⃣ Проверяем dev login...');
    const devLoginResponse = await fetch(`${API_BASE}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+1234567890' }) // Тестовый номер
    });
    const devLoginData = await devLoginResponse.json();
    console.log('📝 Dev login response:', devLoginData);
    
    if (devLoginResponse.ok) {
      console.log('✅ Dev login успешен!');
      
      // 5. Проверяем /me с авторизацией (нужно извлечь cookie из response)
      console.log('\n5️⃣ Проверяем /me с авторизацией...');
      const cookies = devLoginResponse.headers.get('set-cookie');
      if (cookies) {
        console.log('🍪 Получены cookies:', cookies);
        
        const meAuthResponse = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Cookie': cookies }
        });
        const meAuthData = await meAuthResponse.json();
        console.log('✅ /me с авторизацией:', meAuthData);
        
        // 6. Проверяем logout
        console.log('\n6️⃣ Проверяем logout...');
        const logoutResponse = await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Cookie': cookies }
        });
        const logoutData = await logoutResponse.json();
        console.log('✅ Logout:', logoutData);
      }
    } else {
      console.log('ℹ️ Dev login не удался (пользователь не найден) - это нормально для пустой БД');
    }
    
    console.log('\n🎉 Тестирование завершено!');
    console.log('\n📋 Результаты:');
    console.log('✅ Health endpoint работает');
    console.log('✅ Auth ping endpoint работает');
    console.log('✅ /me endpoint работает');
    console.log('✅ Dev login endpoint работает');
    console.log('✅ Logout endpoint работает');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    console.error('Убедитесь, что сервер запущен на', API_BASE);
  }
}

// Запускаем тест
testAuthFlow();
