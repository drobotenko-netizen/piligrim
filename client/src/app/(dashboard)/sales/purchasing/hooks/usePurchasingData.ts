"use client"

import { useState, useEffect } from 'react'
import { getApiBase } from '@/lib/api'

const API_BASE = getApiBase()

export function usePurchasingData() {
  const [calculations, setCalculations] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [buffers, setBuffers] = useState<any[]>([])
  const [productSuppliers, setProductSuppliers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [counterparties, setCounterparties] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [calculationsRes, buffersRes, suppliersRes, ordersRes, ingredientsRes, counterpartiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/purchasing/calculate-orders`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/buffers-calc`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/product-suppliers`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/orders`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/iiko/entities/products`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/counterparties?type=supplier`, { credentials: 'include' })
      ])

      if (calculationsRes.ok) {
        const data = await calculationsRes.json()
        setCalculations(data.calculations || [])
      }

      if (buffersRes.ok) {
        const data = await buffersRes.json()
        setBuffers(data.buffers || [])
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json()
        setProductSuppliers(data.productSuppliers || [])
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }

      if (ingredientsRes.ok) {
        const data = await ingredientsRes.json()
        setIngredients(data.products || [])
      }

      if (counterpartiesRes.ok) {
        const data = await counterpartiesRes.json()
        setCounterparties(data.items || [])
      }
    } catch (error) {
      console.error('[usePurchasingData] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return {
    calculations,
    stocks,
    buffers,
    productSuppliers,
    orders,
    ingredients,
    counterparties,
    loading,
    refetch: loadData
  }
}

