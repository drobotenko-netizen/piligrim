import RecipesClient from './ui/RecipesClient'

export default async function IikoRecipesPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Рецепты и ингредиенты</h1>
      <RecipesClient />
    </div>
  )
}


