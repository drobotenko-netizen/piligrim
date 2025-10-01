import { CustomersClient } from './ui/CustomersClient'

export default function CustomersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Клиенты</h1>
        <p className="text-muted-foreground">
          Анализ клиентской базы и их активности
        </p>
        <div className="mt-2 text-sm text-muted-foreground">
          <p><strong>Недель:</strong> количество недель с заказами</p>
          <p><strong>Цикл:</strong> средний интервал между заказами в днях</p>
          <p><strong>Recency:</strong> дней с последнего заказа</p>
          <p><strong>Давность:</strong> отношение recency к циклу (зеленый &lt; 1, желтый &lt; 2, красный ≥ 2)</p>
        </div>
      </div>
      
      <CustomersClient />
    </div>
  )
}
