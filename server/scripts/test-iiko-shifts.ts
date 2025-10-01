import { IikoClient } from '../src/modules/iiko/client'

const client = new IikoClient()

async function testIikoShifts() {
  try {
    console.log('🔍 Запрос к iiko API: /resto/api/v2/cashshifts/list')
    console.log('Параметры: 2025-09-28 - 2025-10-01, status=ANY')
    console.log('')
    
    const shifts = await client.getCashShifts({
      openDateFrom: '2025-09-28',
      openDateTo: '2025-10-01',
      status: 'ANY'
    })
    
    console.log(`✅ Получено смен: ${shifts.length}`)
    console.log('')
    
    // Показываем первые 3 смены полностью
    shifts.slice(0, 3).forEach((shift, idx) => {
      console.log(`\n========== СМЕНА ${idx + 1} ==========`)
      console.log(JSON.stringify(shift, null, 2))
    })
    
  } catch (e: any) {
    console.error('❌ Ошибка:', e.message)
  }
}

testIikoShifts()

