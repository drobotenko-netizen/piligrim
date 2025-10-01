---
title: Сущности: номенклатура, группы, категории, изображения, шкалы
source: https://ru.iiko.help/articles/#!api-documentations/iikoserver-api
generated: 2025-09-29T09:20:40.649Z
---

# Сущности: номенклатура, группы, категории, изображения, шкалы

## Оглавление

---

Malformed Product id: ''
Argument for @NotNull parameter 'arg' of resto/TestNotNullValidation.methodWithNotNullArg must not be null
 	List<String>
401	
Не аутентифицирован:

не передан параметр key в запросе или в cookie
истек таймаут сессии (обычно 1 час) с момента входа или момента последнего запроса, если работает "обновление токена" (не реализовано в REST API v1/v2)
сервер iikoRMS/iikoChain был перезагружен
сервер iikoRMS/iikoChain находится в процессе (пере)запуска и не может проверить пароль
 	List<ProductType>
404
Объект не найден, некорректный путь

Уведомить пользователя или автора клиента/интеграции.

409
Произошла ошибка бизнес-логики, сервер вернул сообщение для пользователя:

"Доступ запрещен КОД_ПРАВА"
"Операция создает приход на отрицательные остатки..."
"У вас нет права изменять документы задним числом."
"Невозможно создать накладную со складами, принадлежащими разным подразделениям."
... и сотни других
Уведомить пользователя и показать ему текст ошибки
500
Произошла внутренняя ошибка:

User represents store, but no linked store found: %s

Unknown client type for outgoing invoice: %s

Operation is allowed only in %s's thread. Current thread: %s

Operation is not allowed in %s's thread

No session assigned to current thread

java.net.SocketException: Connection reset
product == null
One product expected for article=%s but %d found: %s
Invalid key for item, expected: %s but was: %s
... тысячи их
Уведомить пользователя или автора клиента/интеграции. Может потребоваться обращение в техподдержку iiko.
 
Получение элементов номенклатуры
Чтобы пользоваться API экспорта и импорта номенклатуры:

У пользователя, под чьим именем осуществляется вход, должно быть право B_EN "Редактирование номенклатурных справочников".
### Версия iiko: 6.1

### GET Request	https://host:port/resto/api/v2/entities/products/list
#### Параметры запроса
Information	Если надо отфильтровать по полю, значение которого null, то соответствующее значение параметра не задаём: "parentId=". На сервере это будет список с одним нулевым элементом [null].

Если надо отфильтровать сразу по нескольким параметрам одного типа, например parentId, параметры передаём в следующим виде: "parentId=111&parentId=222&parentId=333". На сервере это преобразуется в список [111, 222, 333].

Следующий список параметров "parentId=111&parentId=222&parentId=" на сервере преобразуется  в [111, 222, null].

Параметр
Версия iiko
Тип, формат
Описание
includeDeleted	6.1	Boolean	Включать ли в результат удаленные элементы. По умолчанию false.
ids	6.2	List<UUID>	Возвращаемые элементы номенклатуры должны иметь id из этого списка.
nums	6.2	List<String>	Возвращаемые элементы номенклатуры должны иметь артикул из этого списка.
types	6.2	List<ProductType>	Возвращаемые элементы номенклатуры должны иметь тип из этого списка.
categoryIds	6.2	List<UUID>	Возвращаемые элементы номенклатуры должны иметь категорию продукта с id из этого списка.
parentIds	6.2	List<UUID>	Возвращаемые элементы номенклатуры должны иметь родительскую группу с id из этого списка.
#### Что в ответе

Список элементов номенклатуры.

[+] Список ProductDto
#### Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/list?includeDeleted=false

[+] Результат

[+] Список ProductGroupDto
Получение элементов номенклатуры 
### Версия iiko: 6.4

### POST Request	https://host:port/resto/api/v2/entities/products/list
#### Тело запроса
Content-Type: application/x-www-form-urlencoded

Параметр
Версия iiko
Тип, формат
Описание
includeDeleted	6.4	Boolean
Включать ли в результат удаленные элементы. По умолчанию false.
revisionFrom
6.4
-1, число
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1

ids
6.4
List<UUID>
Возвращаемые элементы номенклатуры должны иметь id из этого списка.
nums
6.4
List<String>
Возвращаемые элементы номенклатуры должны иметь артикул из этого списка.
codes
6.4
List<String>
Возвращаемые элементы номенклатуры должны иметь код из этого списка.
types
6.4	List<ProductType>
Возвращаемые элементы номенклатуры должны иметь тип из этого списка.
categoryIds
6.4
List<UUID>
Возвращаемые элементы номенклатуры должны иметь категорию продукта с id из этого списка.
parentIds
6.4
List<UUID>
 
#### Что в ответе

Список элементов номенклатуры.

Импорт элемента номенклатуры
### Версия iiko: 6.1

### POST Request	https://host:port/resto/api/v2/entities/products/save
#### Параметры запроса
Название	Тип	Описание
generateNomenclatureCode
Boolean
Надо ли генерировать артикул элемента номенклатуры.

Необязательный. По умолчанию true
generateFastCode
Boolean
Надо ли генерировать код быстрого поиска элемента номенклатуры.

Необязательный. По умолчанию true.
[+] Тело запроса
[+] Пример тела запроса
#### Что в ответе
Содержит результат импорта (Json структура), который состоит из результата валидации импортируемого элемента и самого элемента. Результат валидации состоит из ошибок. Ошибка состоит из кода ошибки и текста ошибки.

Результат

Поле	Тип данных	Значение
result	Enum:
"SUCCESS",
"ERROR"	Результата операции.
errors	List<ErrorDto>	
Список ошибок, не позволивших сделать успешный импорт документа.

response	ProductDto	В случае успешного импорта - сохраненный объект,
в противном случае импортируемый объект.
#### Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/save

[+] Результат
[+] Пример успешного результата вызова API: entities/products/save
[+] Пример НЕ успешного результата вызова API: entities/products/save
Редактирование элемента номенклатуры
### Версия iiko: 6.1

### POST Request	https://host:port/resto/api/v2/entities/products/update
#### Параметры запроса
Название	Тип, формат	Описание
overrideFastCode	Boolean	Перегенерировать ли код быстрого поиска элемента номенклатуры.
По умолчанию false.
overrideNomenclatureCode	Boolean	Перегенерировать ли артикул элемента номенклатуры.
По умолчанию false.
#### Тело запроса
Аналогично импорту только с id редактируемого элемента
Поле
Тип данных
Значение
id	UUID	UUID редактируемого элемента номенклатуры
[+] Тело запроса
#### Что в ответе
Содержит Json структуру результата изменения, которая состоит из результата валидации измененного элемента
и самого элемента. Результат валидации состоит из ошибок. Ошибка состоит из кода ошибки и текста ошибки.

#### Примеры запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/update?overrideFastCode=false&overrideNomenclatureCode=false

[+] Результат
[+] Пример успешного результата вызова API: entities/products/update
[+] Пример НЕ успешного результата вызова API: entities/products/update

Удаление элементов номенклатуры
### Версия iiko: 6.1

### POST Request	https://host:port/resto/api/v2/entities/products/delete
#### Тело запроса
Поле
Тип данных
Значение
items	List<IdCodetDto>	
Список UUID элементов, которые нужно удалить

Поле
Тип данных
Значение
id
UUID
UUID элемента
Код
{ 
   "items":[ 
      { 
         "id":"fcdf4324-4a2f-f250-0162-d3887cf1005d"
      }
   ]
}
#### Что в ответе
Содержит Json структуру результата удаления.

#### Примеры запроса и результат
Запрос
https://localhost:8080/resto/api/v2/entities/products/delete

Результат
XML
{ 
   "items":[ 
      { 
         "id":"fcdf4324-4a2f-f250-0162-d3887cf1005d"
      }
   ]
}

[+] Пример успешного результата вызова API: entities/products/delete
[+] Пример НЕ успешного результата вызова API: entities/products/delete
Восстановление элементов номенклатуры
### Версия iiko: 6.1

### POST Request	https://host:port/resto/api/v2/entities/products/restore
#### Параметры запроса
Параметр	Версия
Тип, формат	Описание
overrideNomenclatureCode	6.4
Boolean	
Если у восстанавливаемого продукта артикул совпадает с одним из текущих и параметр указан равным true, то у восстанавливаемого продукта будет сгенерирован новый артикул.

Необязательный. По умолчанию false.

#### Тело запроса

Поле
Тип данных
Значение
items	List<IdCodetDto>
Список UUID элементов, которые нужно восстановить

Поле
Тип данных
Описание
id	UUID
UUID элемента.
#### Что в ответе

Содержит Json структуру результата восстановления.

#### Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/restore

Результат
Код
{ 
   "items":[ 
      { 
         "id":"fcdf4324-4a2f-f250-0162-d3887cf1005d"
      }
   ]
}

Номенклатурные группы
Получение номенклатурных групп
### Версия iiko: 6.2

### GET Request	https://host:port/resto/api/v2/entities/products/group/list
#### Параметры запроса
Параметр	Версия iiko
Тип, формат	Описание
includeDeleted	6.2
Boolean	Включать ли в результат удаленные элементы. По умолчанию false.
ids	6.2
List<UUID>	Возвращаемые элементы должны иметь id из этого списка.
parentIds	6.2
List<UUID>	Возвращаемые элементы должны иметь родительскую группу с id из этого списка.
revisionFrom
6.4
-1, число
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1

nums
6.2.3
List<String>
Возвращаемые элементы должны иметь артикул из этого списка.
codes
6.2.3
List<String>
Возвращаемые элементы должны иметь код из этого списка.
#### Что в ответе
Список номенклатурных групп

Результат (Список ProductGroupDto) 
Параметр	Тип, формат	Описание
id	UUID	UUID номенклатурной группы.
deleted	Boolean	Удален.
name	String	Имя.
description	String	Описание.
num	String	
Артикул, используется при печати документов (тех. карт и т.д.).

code	String	
Код продукта. Используется для быстрого поиска продукта
в экране редактирования заказа.

parent	UUID	
UUID родительской группы. 
Если группа принадлежит корневой группе, то parent == null.

modifiers	List<ChoiceBindingDto>	Moдификаторы. (у групп всегда отсутствуют).
taxCategory	UUID	UUID налоговой категории.
category	UUID	UUID пользовательской категории.
accountingCategory	UUID	UUID бухгалтерской категории.
color	RGBColorDto	Цвет фона оформления кнопки в iikoFront.
fontColor	RGBColorDto	Цвет шрифта кнопки в iikoFront.
frontImageId	UUID	UUID изображения для отображения в iikoFront.API изображений.
position	Integer	Позиция в меню.
visibilityFilter 	DepartmentFilterDto	
Параметр
Тип, формат
Описание
departments	List<UUID>	Список UUID подразделений
excluding	Boolean	Включающий или исключающий фильтр
#### Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/group/list?includeDeleted=false

[+] Результат
Получение номенклатурных групп 
### Версия iiko: 6.4

### POST Request	https://host:port/resto/api/v2/entities/products/group/list
#### Тело запроса
Поле	Версия iiko	Тип данных	Значение
includeDeleted	6.4	Boolean	Включать ли в результат удаленные элементы. По умолчанию false..
revisionFrom	6.4	-1, число	
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1.                   

ids	6.4
List<UUID>	Возвращаемые элементы должны иметь id из этого списка.
nums	6.4	List<String>	Возвращаемые элементы должны иметь артикул из этого списка.
codes	6.4	List<String>	Возвращаемые элементы должны иметь код из этого списка.
parentIds	6.4	List<UUID>	Возвращаемые элементы должны иметь родительскую группу с id из этого списка.
#### Что в ответе

Список номенклатурных групп

Импорт номенклатурной группы
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/entities/products/group/save
#### Параметры запроса
Параметр	Тип, формат	Описание
generateNomenclatureCode	Boolean	
Надо ли генерировать артикул номенклатурной группы.

Необязательный. По умолчанию true.

generateFastCode	Boolean	
Надо ли генерировать код быстрого поиска номенклатурной группы.

Необязательный. По умолчанию true.

#### Тело запроса
Поле	Версия iiko	Тип данных	Значение
deleted	6.2	Boolean	Удален.
name	6.2	String	Имя.
description	6.2	String	Описание.
parent	6.2	UUID	UUID родительской группы продукта. 
Если продукт принадлежит корневой группе, то parent == null.
taxCategory	6.2	UUID	UUID налоговой категории.
category	6.2	UUID	UUID пользовательской категории.
color	6.2	RGBColorDto	Цвет фона оформления кнопки в iikoFront.
fontColor	6.2	RGBColorDto	Цвет шрифта кнопки в iikoFront.
frontImageId	6.2	UUID	UUID изображения для отображения в iikoFront.
position	6.2	Integer	Позиция в меню.
#### Что в ответе
Содержит Json структуру результата импорта, которая состоит из результата валидации импортируемой группы
и самой группы. Результат валидации состоит из ошибок. Ошибка состоит из кода ошибки и текста ошибки. 

Поле
Тип данных
Значение
result	Enum:
"SUCCESS",
"ERROR"	Результата операции.
errors	List<ErrorDto>	
Список ошибок, не позволивших сделать успешный импорт документа.

response	ProducGrouptDto	В случае успешного импорта - сохраненный объект,
в противном случае импортируемый объект.
#### Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/save

Результат
JSON
{ 
   "name":"Группа 1",
   "description":"тест",
   "parent":"b48f8846-2395-44bb-938d-1e208b753e6d",
   "taxCategory":null,
   "category":null,
   "color":{ 
      "red":170,
      "green":170,
      "blue":170
   },
   "fontColor":{ 
      "red":0,
      "green":0,
      "blue":0
   },
   "frontImageId":"67ae50d5-d1b1-4afb-9d04-469aa49a2e05",
   "position":null
}
[+] Пример успешного результата вызова API: entities/products/group/save
[+] Пример НЕ успешного результата вызова API: entities/products/group/save
Редактирование номенклатурной группы
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/entities/products/group/update
#### Параметры запроса

Параметр	Тип, формат	Описание
overrideFastCode	Boolean	
Перегенерировать ли код быстрого поиска номенклатурной группы.

Необязательный. По умолчанию false

overrideNomenclatureCode	Boolean	
Перегенерировать ли артикул номенклатурной группы.

Необязательный. По умолчанию false.

#### Тело запроса
Аналогично импорту только с id редактируемого элемента:

Поле
Тип данных
Значение
id	UUID	UUID редактируемой номенклатурной группы

JSON
{ 
   "id":"68569fd5-17bc-382b-0165-0a151ab6011e",
   "name":"Группа 1",
   "description":"тестРедактировали",
   "parent":"b48f8846-2395-44bb-938d-1e208b753e6d",
   "taxCategory":null,
   "category":null,
   "color":{ 
      "red":170,
      "green":170,
      "blue":170
   },
   "fontColor":{ 
      "red":100,
      "green":0,
      "blue":0
   },
   "frontImageId":"67ae50d5-d1b1-4afb-9d04-469aa49a2e05",
   "position":null
}

#### Что в ответе

Содержит Json структуру результата изменений, которая состоит из результата валидации измененной группы
и самой группы. Результат валидации состоит из ошибок. Ошибка состоит из кода ошибки и текста ошибки. 

#### Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/update?overrideFastCode=false&overrideNomenclatureCode=false

[+] Результат
[+] Пример успешного результата вызова API: entities/products/update
[+] Пример НЕ успешного результата вызова API: entities/products/update
Удаление номенклатурной группы
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/entities/products/group/delete
#### Тело запроса
ProductsAndGroupsDto<IdListDto IdListDto>

Поле	Тип данных	Значение
products	IdListDto	Список UUID продуктов, которые нужно удалить.
productGroups	IdListDto	Список UUID групп, которые нужно удалить.
JSON
{ 
   "products":{ 
      "items":[ 
         { 
            "id":"883CB6A8-621D-4BFB-8595-403E41BE62E8"
         },
         { 
            "id":"6E1ECAD4-E6A8-4887-B835-9639DACB7387"
         }
      ]
   },
   "productGroups":{ 
      "items":[ 
         { 
            "id":"e10037a7-7e1f-4296-9e2c-a2c9ac551711"
         },
         { 
            "id":"cc455ea0-ad9a-4c28-a350-4d383fb4b71b"
         }
      ]
   }
}
#### Что в ответе
Содержит Json структуру результата удаления. Нельзя удалить уже удаленные объекты. Так же нельзя удалить группу без удаления дочерних элементов. 

Результат 
Поле	Тип данных	Значение
result	
Enum: "SUCCESS", "ERROR"

Результат операции.
errors	List<ErrorDto>	Список ошибок, не позволивших сделать успешный импорт.
response	ProductsAndGroupsDto<Collection<ProductDto>, Collection<ProductGroupDto>>	
В случае успешного удаления - списки удаленных объектов :

Поле	Тип данных	Значение
products	Collection<ProductDto>	Список продуктов, которые удалили.
productGroups	Collection<ProductGroupDto>	Список групп, которые удалили.
в противном случае ошибка с описанием причины.

#### Пример запроса и результата
Запрос
 https://localhost:8080/resto/api/v2/entities/products/group/delete

Результат
JSON
{ 
   "products":{ 
      "items":[ 
         { 
            "id":"883CB6A8-621D-4BFB-8595-403E41BE62E8"
         },
         { 
            "id":"6E1ECAD4-E6A8-4887-B835-9639DACB7387"
         }
      ]
   },
   "productGroups":{ 
      "items":[ 
         { 
            "id":"e10037a7-7e1f-4296-9e2c-a2c9ac551711"
         },
         { 
            "id":"cc455ea0-ad9a-4c28-a350-4d383fb4b71b"
         }
      ]
   }
}
[+] Пример успешного результата вызова API: entities/products/group/delete
[+] Пример НЕ успешного результата вызова API: entities/products/delete

Восстановление номенклатурной группы
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/entities/products/group/restore
#### Параметры запроса
Параметр	Версия iiko
Тип, формат	Описание
overrideNomenclatureCode	6.4
Boolean	
Если у восстанавливаемого группы артикул совпадает с одним из текущих и параметр указан равным true, то у восстанавливаемого группы будет сгенерирован новый артикул.

Необязательный. По умолчанию false.

#### Тело запроса
ProductsAndGroupsDto<IdListDto IdListDto>

Поле	Тип данных	Значение
products	IdListDto	Список UUID продуктов, которые нужно удалить.
productGroups	IdListDto	Список UUID групп, которые нужно удалить.
#### Что в ответе

Содержит Json структуру результата восстановления. Нельзя восстановить НЕ удаленные объекты.
Так же нельзя восстановить группу без восстановления родительской группы, если та удалена. 

Пользовательские категории
Получение пользовательских категорий (GET)
### Версия iiko: 6.2

### GET Request	https://host:port/resto/api/v2/ entities/products/category/list
#### Параметры запроса
Параметр	Тип	Описание
includeDeleted	Boolean	Включать ли в результат удаленные элементы. По умолчанию false.
ids	List<UUID>	Возвращаемые элементы должны иметь id из этого списка.
revisionFrom
-1, число	
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1

Результат (Список EntityDto) 
Параметр	Тип	Описание
id	UUID	UUID категории
deleted	Boolean	Удалена ли данная категория
name	String	Имя категории.
#### Что в ответе
Список пользовательских категорий

#### Пример запроса и результат
Запрос
https://localhost:8080/resto/api/v2/entities/products/category/list

Результат
JSON
[{ 
  "id":"7e29cd73-05da-7ac4-0165-0f11a132002b",
  "rootType":"ProductCategory",
  "deleted":false,
  "code":null,
  "name":"Категория 1"
}]

Получение пользовательских категорий (POST)
### Версия iiko: 6.4

### POST Request	https://host:port/resto/api/v2/entities/products/category/list
#### Параметры запроса
Content-Type: application/x-www-form-urlencoded

Параметр	Версия
Тип	Описание
includeDeleted	 6.4
Boolean	Включать ли в результат удаленные элементы. По умолчанию false.
ids	 6.4
List<UUID>	Возвращаемые элементы должны иметь id из этого списка.
revisionFrom
 6.4
-1, число
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1

#### Что в ответе

Список пользовательских категорий

Импорт пользовательской категории
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/entities/products/category/save
#### Тело запроса
Поле	Тип данных	Значение
name	String	Имя категории.
#### Что в ответе

Json структура результата импорта. 

Результат 
Параметр	Тип, формат	Описание
result	Enum:
"SUCCESS",
"ERROR"	Результата операции.
errors	List<ErrorDto>	
Список ошибок, не позволивших сделать успешный импорт документа.

response	EntityDto	
В случае успешного импорта - сохраненная пользовательская категория,
в противном случае импортируемый объект.

Поле	Тип данных	Значение
id	UUID	UUID категории
deleted	Boolean	Удалена.
name	String	Имя категории.
#### Примеры запроса и результат
Запрос
https://localhost:8080/resto/api/v2/entities/products/category/save

Результат
JSON
{  
   "name":"Категория 1"
}
#### Пример успешного результата вызова API: entities/products/category/save

JSON
{  
   "result":"SUCCESS",
   "errors":null,
   "response":{  
      "id":"7e29cd73-05da-7ac4-0165-0f11a132002b",
      "rootType":"ProductCategory",
      "deleted":false,
      "code":null,
      "name":"Категория 1"
   }
}
#### Пример НЕ  успешного результата вызова API: entities/products/category/save

Category name is not specified or consist of whitespaces 

Редактирование пользовательской категории
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/entities/products/category/update
#### Тело запроса
Поле	Тип данных	Значение
id	UUID	UUID редактируемой категории.
name	String	Новое имя категории.
#### Что в ответе

Json структура результата редактирования. 

#### Пример запроса и результат
Запрос 
https://localhost:8080/resto/api/v2/entities/products/category/save

Результат
JSON
{ 
   "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137",
   "name":"Категория 2"
}
#### Пример успешного результата вызова API: entities/products/category/update

JSON
{  
   "result":"SUCCESS",
   "errors":null,
   "response":{  
      "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137",
      "rootType":"ProductCategory",
      "deleted":false,
      "code":null,
      "name":"Категория 2"
   }
}
#### Пример НЕ успешного результата вызова API: entities/products/category/update

Category name is not specified or consist of whitespaces

 

Удаление пользовательской категории
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/entities/products/category/delete
#### Тело запроса
Поле	Тип данных	Значение
id	UUID	UUID удаляемой категории.
#### Что в ответе

Json структура результата удаления.  Содержит результат удаления. Нельзя удалить уже удаленные объекты.  

#### Пример запроса и результат
Запрос  
https://localhost:8080/resto/api/v2/entities/products/category/delete

Результат
JSON
{ 
   "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137" 
}
#### Пример успешного результата вызова API: entities/products/category/delete

JSON
{  
   "result":"SUCCESS",
   "errors":null,
   "response":{  
      "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137",
      "rootType":"ProductCategory",
      "deleted":true,
      "code":null,
      "name":"Категория 1"
   }
}
#### Пример НЕ успешного результата вызова API: entities/products/category/save

Could not delete already deleted product category: [7e29cd73-05da-7ac4-0165-0f11a132002b].

Восстановление пользовательской категории
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/entities/products/category/restore
#### Тело запроса
Поле	Тип данных	Значение
id	UUID	UUID восстанавливаемой категории.
#### Что в ответе

Json структура результата восстановления.  Содержит результат восстановления. Нельзя восстановить НЕ удаленные объекты.

#### Примеры запроса и результат
Запрос
http://localhost:8080/resto/api/v2/entities/products/category/restore

Результат
JSON
{ 
   "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137" 
}
#### Пример успешного результата вызова API: entities/products/category/restore

JSON
{  
   "result":"SUCCESS",
   "errors":null,
   "response":{  
      "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137",
      "rootType":"ProductCategory",
      "deleted":false,
      "code":null,
      "name":"Категория 1"
   }
}
#### Пример НЕ успешного результата вызова API: entities/products/category/restore
Could not restore not deleted product category: [70936cd4-474d-4b5f-b9bc-ac2799bfc137]​.

Технологические карты
Технологические карты (рецепты) в iiko строго привязаны к элементам номенклатуры (блюдам, модификаторам, заготовкам) и датам: на каждый учетный день элементу номенклатуры может быть сопоставлено не более одной технологической карты. Единственная сопоставленная карта должна задавать метод списания (целиком/по ингредиентам) и состав + количество ингредиентов для всех действующих и удаленных подразделений, размеров блюд.

Ингредиентом блюда, модификатора, заготовки может быть заготовка, имеющая свою собственную технологическую карту. Таким образом, техкарты образуют деревья.

Статья по настройке технологических карт. 

Получение всех технологических карт (getAll)
### Версия iiko: 6.0

### GET Request	https://host:port/resto/api/v2/assemblyCharts/getAll?dateFrom={dateFrom}&dateTo={dateTo}&includeDeletedProducts=true&includePreparedCharts=false
#### Параметры запроса
Параметр	Тип, формат	Описание
dateFrom	yyyy-MM-dd	Учетный день, начиная с которого требуются техкарты. Обязательный параметр.
dateTo	yyyy-MM-dd	Учетный день, начиная с которого техкарты не требуются. Если не задан, возвращаются все будущие техкарты.
includeDeletedProducts	Boolean	Включать ли в результат техкарты для удаленных блюд. По умолчанию true.
includePreparedCharts	Boolean	Включать ли в результат техкарты, разложенные до конечных ингредиентов. По умолчанию false (их может быть много).
#### Что в ответе
Списки актуальных и действующих технологических карт для всей номенклатуры, пересекающих своим интервалом действия заданный интервал (json-структура ChartResultDto).

Примечание
Заданный метод списания для технологической карты влияет на результат ответа при выбранном  includePreparedCharts = true:

если метод списания "Списывать готовое блюдо", то в preparedCharts возвращается элемент списания (например, полуфабрикат в составе заготовки). 
если метод списания "Списывать ингредиенты", то в preparedCharts возвращаются ингредиенты элемента списания (например, ингредиенты полуфабриката).

Результат (ChartResultDto с полным списком техкарт) 
Параметр	Тип, формат	Описание
knownRevision	Integer	
Ревизия сервера, на которую валиден ответ.

Гарантируется, что в базе не может произойти изменений, помеченных ревизией меньше, чем данная, поэтому клиент может вызывать метод assemblyCharts/getAllUpdate с этой ревизией, чтобы получить только изменившиеся технологические карты.

Используется в assemblyCharts/getAll и assemblyCharts/getAllUpdate. В остальных методах, возвращающих урезанные данные (непригодные для getAllUpdate) всегда равно -1.

assemblyCharts	AssemblyChartDto	
Список исходных технологических карт, интервал действия которых пересекает запрошенный интервал.

preparedCharts	PreparedChartDto	
Список разложенных до ингредиентов технологических карт, интервал действия которых пересекает запрошенный интервал.

deletedAssemblyChartIds	Список UUID	
Всегда null (клиент должен удалить все ранее закешированные техкарты).

deletedPreparedChartIds	Список UUID	Всегда null (клиент должен удалить все ранее закешированные техкарты).
#### Пример запроса и результат
https://localhost:8080/resto/api/v2/assemblyCharts/getAll?dateFrom=2010-01-01&dateTo=2010-01-02

ChartResultDto (список всех техкарт)

JSON
{
  "knownRevision" : -1,
  "assemblyCharts" : [ ],
  "preparedCharts" : [ ]
  } ],
  "deletedAssemblyChartIds" : null,
  "deletedPreparedChartIds" : null
}
Получение обновления технологических карт (getAllUpdate)
### Версия iiko: 6.0

### GET Request	https://host:port/resto/api/v2/assemblyCharts/getAllUpdate?knownRevision={knownRevision}&dateFrom={dateFrom}&dateTo={dateTo}&includeDeletedProducts=true&includePreparedCharts=false
#### Параметры запроса
Параметр	Тип, формат	Описание
knownRevision	Integer	Значение поля knownRevision из предыдущего результата вызова getAll или getAllUpdate с теми же параметрами.
dateFrom	yyyy-MM-dd	Учетный день, начиная с которого требуются техкарты. Обязательный параметр.
dateTo	yyyy-MM-dd	Учетный день, начиная с которого техкарты не требуются. Если не задан, возвращаются все техкарты, включая будущие.
includeDeletedProducts	Boolean	Включать ли в результат техкарты для удаленных блюд. По умолчанию true. Получение обновлений не поддерживается для false.
includePreparedCharts	Boolean	Включать ли в результат техкарты, разложенные до конечных ингредиентов. По умолчанию false (их может быть много).
#### Что в ответе
Списки новых и изменившихся актуальных и действующих технологических карт для всей номенклатуры, пересекающих своим интервалом действия заданный интервал (json-структура ChartResultDto).

Примечание. По состоянию на 6.0 получение обновлений полностью работает только в iikoChain.  

Результат (ChartResultDto с обновлением техкарт) 
Параметр	Тип, формат	Описание
knownRevision	Integer	
Ревизия сервера, на которую валиден ответ.

Гарантируется, что в базе не может произойти изменений, помеченных ревизией меньше, чем данная, поэтому клиент может вызывать метод assemblyCharts/getAllUpdate с этой ревизией, чтобы получить только изменившиеся технологические карты.

Используется в assemblyCharts/getAll и assemblyCharts/getAllUpdate. В остальных методах, возвращающих урезанные данные (непригодные для getAllUpdate) всегда равно -1.

assemblyCharts	AssemblyChartDto	
Список новых и изменившихся исходных технологических карт, интервал действия которых пересекает запрошенный интервал.

preparedCharts	PreparedChartDto	
Список новых и изменившихся разложенных до ингредиентов технологических карт, интервал действия которых пересекает запрошенный интервал.

deletedAssemblyChartIds	Список UUID	
Список UUID исходных технологических карт, удаленных начиная с указанной ревизии, либо null, если они не запрашивались. Клиент должен забыть перечисленные техкарты и начать считать актуальными те, что действовали на даты, предшествовавшие (по dateFrom/dateTo) удаленным. Если предшествующей техкарты нет в кеше клиента, следует считать, что ранее были получены не все данные и перезапрашивать полный список техкарт (getAll).

6.0: не работает на iikoRMS (не сообщает об удалениях, реплицированных с iikoChain)

deletedPreparedChartIds	Список UUID	Список UUID разложенных технологических карт, удаленных начиная с указанной ревизии, либо null, если они не запрашивались.
#### Пример запроса и результат
https://localhost:8080/resto/api/v2/assemblyCharts/getAllUpdate?knownRevision=999999999&dateFrom=2010-01-01&dateTo=2010-01-02

ChartResultDto (невозможно получить обновление техкарт)

JSON
{
  "knownRevision" : -1,
  "assemblyCharts" : null,
  "preparedCharts" : null,
  "deletedAssemblyChartIds" : null,
  "deletedPreparedChartIds" : null
}

Получение дерева актуальных технологических карт для элемента номенклатуры (getTree) 
### Версия iiko: 6.0

### GET Request	https://host:port/resto/api/v2/assemblyCharts/getTree?date={date}&productId={productId}&departmentId={departmentId}
#### Параметры запроса
Параметр	Тип, формат	Описание
departmentId	UUID	UUID подразделения. Если не указан, возвращается технологическая карта со строками, действующими в любом из подразделений, клиент должен сам анализировать применимость (поле items.storeSpecification).
productId	UUID	UUID элемента номенклатуры (блюда, модификатора, заготовки) (обязательно)
date	yyyy-MM-dd	Учетный день
#### Что в ответе
Дерево актуальных технологических карт для элемента номенклатуры и действующая разложенная до конечных ингредиентов его технологическая карта, в том числе с учетом "раздельных тех.карт по размерам блюда" (json-структура ChartResultDto).

Результат (ChartResultDto с деревом техкарт) 
Параметр	Тип, формат	Описание
knownRevision	Integer	
Всегда -1, т.к. обновление дерева техкарт невозможно вычислить по одной ревизии.

Ревизия сервера, на которую валиден ответ.

Гарантируется, что в базе не может произойти изменений, помеченных ревизией меньше, чем данная, поэтому клиент может вызывать метод assemblyCharts/getAllUpdate с этой ревизией, чтобы получить только изменившиеся технологические карты.

Используется в assemblyCharts/getAll и assemblyCharts/getAllUpdate. В остальных методах всегда возвращается -1.

assemblyCharts	AssemblyChartDto	
Дерево исходных технологических карт для заданного элемента номенклатуры.

То есть, техкарта запрошенного продукта и техкарты всех заготовок, входящих в него, рекурсивно.

Если фильтр departmentId не был задан, часть строк некоторых техкарт (и техкарты целиком) могут действовать не во всех подразделениях, клиент должен сам анализировать поля storeSpecification.

Если фильтр departmentId был задан, фильтры storeSpecification будут урезаны до одного указанного подразделения.

preparedCharts	PreparedChartDto	
Технологическая карта для корневого (запрошенного) элемента номенклатуры, разложенная до конечных ингредиентов, списываемых со склада.

deletedAssemblyChartIds	Список UUID	
Всегда null

deletedPreparedChartIds	Список UUID	Всегда null
#### Пример запроса и результат
Запрос
https://localhost:8080/resto/api/v2/assemblyCharts/getTree?date=2019-01-01&productId=db54eef3-8db9-4ede-93bc-c849b9d9b33d&departmentId=bc367d9e-4876-4bb1-9b31-2d332387bc5b

[+] ChartResultDto (дерево техкарт)

Получение исходной технологической карты для элемента номенклатуры (getAssembled)
### Версия iiko: 6.0

### GET Request	https://host:port/resto/api/v2/assemblyCharts/getAssembled?date={date}&productId={productId}&departmentId={departmentId}
#### Параметры запроса
Параметр	Тип, формат	Описание
date	yyyy-MM-dd	Учетный день
productId	UUID	UUID элемента номенклатуры (блюда, модификатора, заготовки) (обязательно)
departmentId	UUID	UUID подразделения. Если не указан, возвращается технологическая карта со строками, действующими в любом из подразделений, клиент должен сам анализировать применимость (поле items.storeSpecification).
#### Что в ответе
Первый уровень актуальной технологической карты (json-структура ChartResultDto, содержащая не более одного элемента в списке assemblyCharts: AssemblyChartDto)

[+] Результат (AssemblyChartDto)
#### Пример запроса и результат
Запрос
https://localhost:8080/resto/api/v2/assemblyCharts/getAssembled?date=2019-01-01&productId=db54eef3-8db9-4ede-93bc-c849b9d9b33d&departmentId=bc367d9e-4876-4bb1-9b31-2d332387bc5b

[+] AssemblyChartDto

Получение технологической карты элемента номенклатуры, разложенной до конечных ингредиентов (getPrepared)
### Версия iiko: 6.0

### GET Request	https://host:port/resto/api/v2/assemblyCharts/getPrepared?date={date}&productId={productId}&departmentId={departmentId}
#### Параметры запроса
Параметр Тип, формат Описание date yyyy-MM-dd Учетный день productId UUID UUID элемента номенклатуры (блюда, модификатора, заготовки) (обязательно) departmentId UUID UUID подразделения. Если не указан, возвращается технологическая карта со строками, действующими в любом из подразделений, клиент должен сам анализировать применимость (поле items.storeSpecification).
[+] Результат (PreparedChartDto)
#### Пример запроса и результат
Запрос
https://localhost:8080/resto/api/v2/assemblyCharts/getPrepared?date=2019-01-01&productId=db54eef3-8db9-4ede-93bc-c849b9d9b33d&departmentId=bc367d9e-4876-4bb1-9b31-2d332387bc5b

PreparedChartDto

JSON
{
  "knownRevision" : -1,
  "assemblyCharts" : null,
  "preparedCharts" : [ {
    "id" : "2ee10f3d-664c-c033-0161-422c7d010f68",
    "assembledProductId" : "a59c04b9-7f27-4773-8f6e-42b411f24941",
    "dateFrom" : "2018-01-29",
    "dateTo" : null,
    "productSizeAssemblyStrategy" : "COMMON",
    "items" : [ {
      "id" : "2ee10f3d-664c-c033-0161-422c7d010f69",
      "sortWeight" : 0.0,
      "productId" : "88cc2fe9-b3ff-4abb-a880-d2f2ba740461",
      "productSizeSpecification" : null,
      "storeSpecification" : null,
      "amount" : 0.001
    } ]
  } ],
  "deletedAssemblyChartIds" : null,
  "deletedPreparedChartIds" : null
}

Получение технологической карты по id (byId)
### GET Request	https://host:port/resto/api/v2/assemblyCharts/byId
#### Параметры запроса

Параметр	Тип	Обязательный
Описание
id
UUID	да
UUID технологической карты
#### Что в ответе
Технологическая карта

#### Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/assemblyCharts/byId?id=B86DA805-9512-44A7-85CA-5DE94272CE07

[+] Результат
 
Получение истории техкарт по продукту (getHistory)
### GET Request	https://host:port/resto/api/v2/assemblyCharts/getHistory
#### Параметры запроса

Параметр	Тип	Обязательный
Описание
productId	UUID	да
UUID приготавливаемого элемента номенклатуры (блюда, модификатора, заготовки)
departmentId	UUID	да
UUID подразделения. Если не указан, возвращается технологическая карта со строками, действующими в любом из подразделений.
#### Что в ответе
Список всех тех.карт приготавливаемого элемента номенклатуры.

#### Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/assemblyCharts/getHistory?productId=A00A470C-6CC9-4B7F-835F-393E41AF8FCF

[+] Результат
Создание технологической карты
### Версия iiko: 6.4

### POST Request	https://host:port/resto/api/v2/assemblyCharts/save
[+] Тело запроса
#### Пример Body

XML
{
    "assembledProductId": "31e6155c-e842-448f-8266-1d05eb8e977a",
    "dateFrom": "2019-04-01",
    "dateTo": null,
    "assembledAmount": 2,
    "productWriteoffStrategy": "ASSEMBLE",
    "productSizeAssemblyStrategy": "COMMON",
    "items": [
        {
            "sortWeight": 0,
            "productId": "56ca36c8-eb11-4f0a-802c-f96d0ce68e27",
            "productSizeSpecification": null,
            "storeSpecification": null,
            "amountIn": 0.4,
            "amountMiddle": 0.36,
            "amountOut": 0.36,
            "amountIn1": 0,
            "amountOut1": 0,
            "amountIn2": 0,
            "amountOut2": 0,
            "amountIn3": 0,
            "amountOut3": 0,
            "packageTypeId": null
        }
    ],
    "technologyDescription": "",
    "description": "",
    "appearance": "",
    "organoleptic": "",
    "outputComment": ""
}

#### Что в ответе
Созданная тех. карта. 

#### Пример запроса и результат
Запрос
https://localhost:9080/resto/api/v2/assemblyCharts/save

Результат

XML
{
    "result": "SUCCESS",
    "errors": null,
    "response": {
        "id": "8cb98504-c000-ede1-016a-9371e3240031",
        "assembledProductId": "31e6155c-e842-448f-8266-1d05eb8e977a",
        "dateFrom": "2019-04-01",
        "dateTo": null,
        "assembledAmount": 2,
        "productWriteoffStrategy": "ASSEMBLE",
        "productSizeAssemblyStrategy": "COMMON",
        "items": [
            {
                "id": "8cb98504-c000-ede1-016a-9371e3240033",
                "sortWeight": 0,
                "productId": "56ca36c8-eb11-4f0a-802c-f96d0ce68e27",
                "productSizeSpecification": null,
                "storeSpecification": null,
                "amountIn": 0.4,
                "amountMiddle": 0.36,
                "amountOut": 0.36,
                "amountIn1": 0,
                "amountOut1": 0,
                "amountIn2": 0,
                "amountOut2": 0,
                "amountIn3": 0,
                "amountOut3": 0,
                "packageCount": 0,
                "packageTypeId": null
            }
        ],
        "technologyDescription": "",
        "description": "",
        "appearance": "",
        "organoleptic": "",
        "outputComment": ""
    }
}

 
Удаление технологической карты
### Версия iiko: 6.4

### POST Request	https://host:port/resto/api/v2/assemblyCharts/delete
#### Тело запроса
Поле	Тип
Описание
id	UUID	UUID технологической карты
#### Пример Body

Код
{
    "id": "8cb98504-c000-ede1-016a-9371e3240031"
}
#### Что в ответе

UUID удалённой технологической карты 

#### Пример запроса и результат

Запрос
https://localhost:9080/resto/api/v2/assemblyCharts/delete

Результат

XML
{
    "result": "SUCCESS",
    "errors": null,
    "response": "8cb98504-c000-ede1-016a-9371e3240031"
}

Приложение: структура StoreSpecification
Структура StoreSpecification используется для указания на подмножество подразделений (департментов), в которых действует содержащая ее строка тех.карты.

Параметр
Тип, формат
Описание
departments	List<UUID>	
Список ID подразделений

inverse	Boolean	
false — фильтр является включающим (строка действует для всех перечисленных подразделений)

true — фильтр является исключающим (строка действует для всех подразделений, КРОМЕ перечисленных, в том числе для подразделений, созданных после последнего сохранения техкарты)

#### Примеры

{"departments" : ["3f896777-4560-45f7-a7b0-28b4bf0d6a36", "f636376d-e871-49ad-8281-65259f29aab5"], "inverse" : false}, — только в двух указанных подразделениях.

{"departments" : ["3f896777-4560-45f7-a7b0-28b4bf0d6a36"], "inverse" : true}, — во всех подразделениях, кроме одного, включая подразделения, созданные после сохранения техкарты.

{"departments" : [], "inverse" : true}, — общая строка для всех подразделений, включая созданные после сохранения техкарты (то есть, версионирование технологических карт отсутствует).

Работа с изображениями
Выгрузка изображения
### Версия iiko: 6.2

### GET Request	https://host:port/resto/api/v2/images/load?imageId={imageId}
#### Параметры запроса
Параметр
Тип, формат
Описание
imageId	UUID	UUID запрашиваемого изображения. 
#### Что в ответе
Выгружено изображение.

Поле
Версия iiko
Тип данных
Описание
id	6.2	UUID	UUID изображения.
data	6.2	byte[]	
Изображение в Base64.

#### Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/images/load?imageId=567791bd-7881-4bcf-8f84-138ca9d0f53c

[+] Результат
Импорт изображений
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/images/save
#### Тело запроса
Поле
Версия iiko
Тип данных
Значение
id	6.2
byte[]	Изображение в Base64.
Размер изображения не должен превышать
максимальный размер установленный в настройках сервера.
Настройка "saved-image-max-size-mb". По умолчанию 512Мб. 
#### Что в ответе
Json структура результата импорта.

Результат
Поле	Тип данных	Значение
result	Enum:
"SUCCESS",
"ERROR"	Результата операции.
errors	List<ErrorDto>	
Список ошибок, не позволивших сделать успешный импорт документа.

response	ImageDto	Cохраненное изображение.
#### Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/images/save

[+] Результат
Удаление изображений
### Версия iiko: 6.2

### POST Request	https://host:port/resto/api/v2/images/delete
#### Тело запроса
Поле	Тип данных	Значение
items	List<IdCodetDto>	

Список UUID изображений, которые нужно удалить.

Поле	Тип данных	Значение
id	UUID	UUID элемента
Код
{ 
   "items":[ 
      { 
         "id":"fcdf4324-4a2f-f250-0162-d3887cf1005d"
      }
   ]
}
Результат
Поле
Тип данных
Описание
result	Enum:
"SUCCESS",
"ERROR"
Результат операции.
errors	List<ErrorDto>	
Список ошибок, не позволивших сделать успешный импорт документа.

response
IdListDto
Список UUID изображений, которые удалили.
#### Пример запроса и результата
Запрос

https://localhost:8080/resto/api/v2/images/delete

Результат

JSON
Formatted JSON Data{ 
   "result":"SUCCESS",
   "errors":null,
   "response":{ 
      "items":[ 
         { 
            "id":"48ba540a-d767-f95a-0164-f56e1e50007f"
         }
      ]
   }
}

Работа со шкалой и размерами
Доступ  
Чтобы пользоваться данным API:

У пользователя, под чьим именем осуществляется вход, должно быть право B_EN "Редактирование номенклатурных справочников".
Описание шкалы с размерами 
 
Параметр
Тип, формат
Описание
id	UUID	UUID шкалы.
deleted	Boolean	Удалена или нет.
name	String	Название шкалы.
productSizes	List<ProductSizeDto>	
Список размеров

Параметр
Тип, формат
Описание
id 	UUID	UUID размера.
deleted 	Boolean	Удалён или нет.

name 	String
Название размера.
shortName
String
Короткое название.
priority
Integer
Местоположение размера в списке размеров шкалы.
default
Boolean
Является ли размером по умолчанию для данной шкалы. У шкалы может быть не больше одного размера по умолчанию.

Получение шкал размеров (GET) 
### GET Request	https://host:port/resto/api/v2/entities/productScales
#### Параметры запроса
Параметр
Тип
Описание
ids	List<UUID>	Включать ли в ответ удаленные элементы. По умолчанию false.
includeDeleted
Boolean
Включать ли в ответ удаленные элементы. По умолчанию false.
#### Что в ответе
Список шкал с размерами

#### Пример запроса и результат
Запрос 
https://localhost:8080/resto/api/v2/entities/productScales?includeDeleted=true&ids=64efc54c-ad17-4923-9d94-2720822fdd7e&ids=f56f3600-c883-495e-93dd-298219a416e4

[+] Результат

Получение шкал размеров (POST) 
### POST Request	https://host:port/resto/api/v2/ entities/productScales
#### Тело запроса
Content-Type: application/x-www-form-urlencoded

Параметр
Тип
Описание
ids	List<UUID>	Возвращаемые шкалы размеров должны иметь id из этого списка.
includeDeleted
Boolean
Включать ли в ответ удаленные элементы. По умолчанию false.
#### Что в ответе
Шкала размеров

Получение шкалы размеров по id 
### GET Request	https://host:port/resto/api/v2/entities/productScales/{productScaleId}
#### Параметры запроса

Параметр
Тип
Описание
productScaleId 	UUID 	UUID шкалы.
#### Что в ответе
Шкала с размерами

#### Пример запроса и результат
Запрос 
https://localhost:8080/resto/api/v2/entities/productScales/64efc54c-ad17-4923-9d94-2720822fdd7e

[+] Результат

Создание шкалы 
### POST Request	https://host:port/resto/api/v2/entities/productScales/save
#### Тело запроса
Поле
Тип данных
Значение
productSizes	List<ProductSizeDto>
Список размеров

Поле
Тип
Описание
name	String
Название размера
shortName
String
Короткое название
priority
Integer
Место в списке
default
Boolean
Является ли размером по умолчанию
name
String
Название шкалы

[+] Пример тела запроса
#### Что в ответе
Созданная шкала с размерами. 

#### Пример запроса и результат
Запрос 
https://localhost:8080/resto/api/v2/entities/productScales/save

[+] Результат
Редактирование шкалы 
### POST Request	https://host:port/resto/api/v2/entities/productScales/update
#### Тело запроса

Поле
Тип
Значение
id
UUID
UUID шкалы
name
String
Название шкалы
productSizes	List<ProductSizeDto>
Список размеров

Поле
Тип	
Описание
id	UUID
UUID размера. Если не задан, то создаётся новый
deleted
Boolean
Удалён или нет
name
String
Название размера
shortName
String
Короткое название
priority
Integer
Место в списке
default
Boolean
Является ли размером по умолчанию
#### Что в ответе
Отредактированная шкала с размерами

Удаление шкал 
### POST Request	https://host:port/resto/api/v2/entities/productScales/delete
#### Тело запроса

Поле
Тип данных
Значение
items	List<IdCodetDto>
Список UUID шкал, которые нужно удалить.

Поле
Тип данных
Описание
id	UUID
UUID шкалы.

Код
{ 
   "items":[ 
      { 
         "id":"64efc54c-ad17-4923-9d94-2720822fdd7e"
      }
   ]
}

#### Что в ответе
Удалённая шкала с размерами 

#### Пример запроса и результат
Запрос 
https://localhost:8080/resto/api/v2/entities/productScales/delete

[+] Результат

Восстановление шкал 
### POST Request	https://host:port/resto/api/v2/entities/productScales/restore
#### Тело запроса

Поле
Тип данных
Значение
items	List<IdCodetDto>
Список UUID шкал, которые нужно восстановить.

Поле
Тип данных
Описание
id	UUID
UUID шкалы.

Код
{ 
   "items":[ 
      { 
         "id":"64efc54c-ad17-4923-9d94-2720822fdd7e"
      }
   ]
}

#### Что в ответе
Восстановленная шкала с размерами 

#### Пример запроса и результат
Запрос
https://localhost:8080/resto/api/v2/entities/productScales/restore

[+] Результат

Получение шкалы с коэффициентами и доступностью размеров 
### GET Request	https://host:port/resto/api/v2/entities/products/{productId}/productScale
#### Параметры запроса
Параметр
Тип
Описание
productId 	UUID 	UUID продукта. 
#### Что в ответе
Шкала с коэффициентами и доступностью размеров

Параметр	Тип, формат	Описание
id	UUID	UUID шкалы.
deleted	Boolean	Удалена или нет.
name	String	Название шкалы.
productSizes	List<ProductSizeDto>	
Список размеров с коэффициентами и доступностью.

Поле
Тип
Описание
id	UUID	UUID размера.
deleted	Boolean	Удалён или нет.
name	String	Название размера.
shortName
String
Короткое название.
priority
Integer
Местоположение размера в списке размеров шкалы.
default
Boolean
Является ли размером по умолчанию для данной шкалы.
disabled
Boolean
Доступен ли данный размер в текущем продукте
factors	List<ProductSizeFactorDto> 	
Коэффициенты для данного размера

Поле
Тип
Описание
startNumber	Integer	Количество от
factor	BigDecimal	Коэффициент
#### Примеры запроса и результат
Запрос 
https://localhost:8080/resto/api/v2/entities/products/f928e371-81ac-409d-86d7-0ebb16fb1223/productScale

[+] Результат
Запрос
https://localhost:8080/resto/api/v2/entities/products/94c07bee-1382-4a87-b43e-5b88fa561588/productScale

Результат
Код
{
    "result": "SUCCESS",
    "errors": null,
    "response": null
}

Получение шкал с коэффициентами и доступностью размеров по списку продуктов (GET) 
### GET Request
https://host:port/resto/api/v2/entities/products/productScales  

#### Параметры запроса
Чтобы задать UUID для нескольких продуктов используем параметр productId несколько раз. 

Параметр
Тип
Описание
includeDeletedProducts	Boolean
Включать ли в результат шкалы для удалённых продуктов. По умолчанию - false.
productId
UUID
UUID продукта. Если не задать, то возвращаются шкалы для всех не удалённых продуктов.

#### Что в ответе
Список пар (productId : шкала)

#### Пример запроса и результат
https://localhost:8080/resto/api/v2/entities/products/productScales?productId=f928e371-81ac-409d-86d7-0ebb16fb1223&productId=c5016116-d4cf-4afe-998e-0059fc0964f2

[+] Результат

Получение шкал с коэффициентами и доступностью размеров по списку продуктов (POST) 
 
### POST Request	https://host:port/resto/api/v2/entities/products/productScales
#### Параметры запроса
Чтобы задать UUID для нескольких продуктов используем параметр productId несколько раз.

Content-Type: application/x-www-form-urlencoded 

Параметр
Тип
Описание
includeDeletedProducts	Boolean
Включать ли в результат шкалы для удалённых продуктов. По умолчанию - false.
productId
UUID
UUID продукта. Если не задать, то возвращаются шкалы для всех не удалённых продуктов.

#### Что в ответе
Список пар (productId : шкала)

Задание/редактирование шкалы с доступностью и коэффициентами для размеров 
### POST Request	https://host:port/resto/api/v2/entities/products/{productId}/productScale
#### Параметры запроса
Параметр
Тип, формат
Описание
productId 	UUID
UUID продукта
#### Тело запроса
Поле
Тип	
Описание
id	UUID
UUID шкалы
productSizes
List<ProductSizeDto> 	
Список коэффициентов и доступности для размеров

Поле
Тип
Описание
id	UUID
UUID размера
disabled	Boolean
Доступен ли данный размер в текущем продукте

factors 	List<ProductSizeFactorDto>
Коэффициенты для данного размера

Поле
Тип
Описание
startNumber	Integer
Количество от
factor 	BigDecimal
Коэффициент
 

[+] Пример тела запроса

#### Что в ответе
Шкала с коэффициентами и доступностью размеров

#### Пример запроса и результат
Запрос
https://localhost:8080/resto/api/v2/entities/products/f928e371-81ac-409d-86d7-0ebb16fb1223/productScale

[+] Результат

Удаление шкалы размеров у продукта 
### DELETE Request	https://host:port/resto/api/v2/entities/products/{productId}/productScale
#### Параметры запроса
Параметр
Тип, формат
Описание
productId 	UUID
UUID продукта
 
#### Что в ответе
UUID шкалы

Загрузка и редактирование приходной накладной
### Версия iiko: 3.9 (редактирование с 5.2)

### POST Request
https://host:port/resto/api/documents/import/incomingInvoice

Content-Type: application/xml
#### Тело запроса
Формат даты по полям метода загрузки приходной накладной:
<dateIncoming>dd.mm.YYYY</dateIncoming>
<dueDate>dd.mm.YYYY</dueDate>
<incomingDate>YYYY-mm-dd</incomingDate>

      <supplierProduct>BF1DA0F2-B511-431E-BC7D-F2A68715054B</supplierProduct>
      <product>0F22AA60-E8AE-4C8E-80CD-F1E00B88FEC6</product>
      <num>1</num>
      <containerId>00000000-0000-0000-0000-000000000000</containerId>
      <amountUnit>6040D92D-E286-F4F9-A613-ED0E6FD241E1</amountUnit>
      <actualUnitWeight/>
      <discountSum>0.00</discountSum>
      <sumWithoutNds>30.00</sumWithoutNds>
      <ndsPercent>0.00</ndsPercent>
      <sum>30.00</sum>
      <priceUnit/>
      <price>10.00</price>
      <code>25753</code>
      <store>1239d270-1bbe-f64f-b7ea-5f00518ef508</store>
      <customsDeclarationNumber>cdn-7</customsDeclarationNumber>
      <actualAmount>3.00</actualAmount>
    </item>
  <item>
      <amount>4.00</amount>
      <supplierProduct>18C66E42-9A71-402A-81B0-A0DAA8E74F4B</supplierProduct>
      <product>B2D954CE-FC7A-44FF-9987-35AF59F16966</product>
      <num>2</num>
      <containerId>00000000-0000-0000-0000-000000000000</containerId>
      <amountUnit>6040D92D-E286-F4F9-A613-ED0E6FD241E1</amountUnit>
      <actualUnitWeight/>
      <discountSum>0.00</discountSum>
      <sumWithoutNds>80.00</sumWithoutNds>
      <ndsPercent>0.00</ndsPercent>
      <sum>80.00</sum>
      <priceUnit/>
      <price>20.00</price>
      <code>25752</code>
      <store>1239d270-1bbe-f64f-b7ea-5f00518ef508</store>
      <customsDeclarationNumber>cdn-7</customsDeclarationNumber>
      <actualAmount>4.00</actualAmount>
    </item>
  </items>
  <conception>2609B25F-2180-BF98-5C1C-967664EEA837</conception>
  <comment>comment-7</comment>
  <documentNumber>dn-7</documentNumber>
  <dateIncoming>17.12.2014</dateIncoming>
  <useDefaultDocumentTime>true</useDefaultDocumentTime>
  <invoice>in-7</invoice>
  <defaultStore>1239d270-1bbe-f64f-b7ea-5f00518ef508</defaultStore>
  <supplier>3F08E41C-AA25-4573-B1E0-60B3B8A09F6A</supplier>
  <dueDate>27.12.2014</dueDate>
  <incomingDocumentNumber>idn-7</incomingDocumentNumber>
  <employeePassToAccount>9e1a4e13-f811-4dea-94b4-575b2cf0f2f8</employeePassToAccount>
  <transportInvoiceNumber>tin-7</transportInvoiceNumber>
</document>

Результат

XML
HTTP/1.1 200 OK
Server: Apache-Coyote/1.1 
Vary: Accept-Encoding
Content-Type: application/xml 
Content-Length: 188
Date: Wed, 17 Dec 2014 11:27:26 GMT 
<?xml version="1.0" encoding="UTF-8" standalone="yes"?> 
<documentValidationResult> 
  <documentNumber>dn-7</documentNumber>  
  <valid>true</valid> 
  <warning>false</warning>
</documentValidationResult>

Загрузка и редактирование расходной накладной
### Версия iiko: 4.4

### POST Request
https://host:port/resto/api/documents/import/outgoingInvoice

Content-Type: application/xml
#### Тело запроса
Структура outgoingInvoiceDto 

            <productId>99193cab-ee2b-4e76-9589-5b0d55ceaf05</productId>
            <productArticle>00002</productArticle>
            <storeId>7effd65d-3417-4924-a995-552f9520a048</storeId>
            <price>30.000000000</price>
            <amount>1.000000000</amount>
            <sum>30.000000000</sum>
            <discountSum>0.000000000</discountSum>
        </item>
    </items>
</document>
Результат

XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<documentValidationResult>
    <valid>true</valid>
    <warning>false</warning>
    <documentNumber>400234</documentNumber>
</documentValidationResult>

Распроведение приходной накладной
### Версия iiko: 7.7

### POST Request
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xs:schema version="1.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">    <xs:element name="document" type="incomingInvoiceDto"/>     <xs:complexType name="incomingInvoiceDto">        <xs:sequence>            <!--Позиции документа-->            <xs:element name="items" minOccurs="0">                <xs:complexType>                    <xs:sequence>                        <xs:element name="item" type="incomingInvoiceItemDto" minOccurs="0" maxOccurs="unbounded"/>                    </xs:sequence>                </xs:complexType>            </xs:element>            <!--            Id документа (только чтение)            @since 5.4            -->            <xs:element name="id" type="xs:string" minOccurs="0"/>            <!--Концепция (guid)-->            <xs:element name="conception" type="xs:string" minOccurs="0"/>            <!--            Код концепции.            @since 7.8            -->            <xs:element name="conceptionCode" type="xs:string" minOccurs="0"/>            <!--Комментарий-->            <xs:element name="comment" type="xs:string" minOccurs="0"/>            <!--Учетный номер документа-->            <xs:element name="documentNumber" type="xs:string" minOccurs="0"/>            <!--            Дата документа.            Поддерживаемые форматы:            yyyy-MM-ddTHH:mm:ss, yyyy-MM-dd (dd.MM.yyyy не рекомендуется).            -->            <xs:element name="dateIncoming" type="xs:string" minOccurs="0"/>            <!--Номер счет-фактуры.-->            <xs:element name="invoice" type="xs:string" minOccurs="0"/>            <!--Склад. Если указан, то в каждой позиции накладной нужно указать этот же склад.-->            <xs:element name="defaultStore" type="xs:string" minOccurs="0"/>            <!--Поставщик-->            <xs:element name="supplier" type="xs:string" minOccurs="0"/>            <!--            Срок оплаты.            Поддерживаемые форматы:            yyyy-MM-ddTHH:mm:ss (dd.MM.yyyy не рекомендуется)            -->            <xs:element name="dueDate" type="xs:string" minOccurs="0"/>            <!--            Входящая дата внешнего документа в формате yyyy-MM-dd.            Если при импорте не указана, то берется из dateIncoming.            @since 7.6.1            -->            <xs:element name="incomingDate" type="xs:string" minOccurs="0"/>            <!--            false (по умолчанию): использовать переданные дату-время dateIncoming как есть.            true: использовать настройки проведения документов, заданные в подразделении:             * В режиме "текущее время" - дату и время из dateIncoming;             * "фиксированное время" или "время закрытия кассовой смены" - дату из dateIncoming, а время из настроек.            @since 5.2            -->            <xs:element name="useDefaultDocumentTime" type="xs:boolean" minOccurs="0" default="false"/>            <xs:element name="status" type="documentStatus" minOccurs="0"/>            <!--Входящий номер внешнего документа-->            <xs:element name="incomingDocumentNumber" type="xs:string" minOccurs="0"/>            <!--Сотрудник (поле "зачесть сотруднику" на форме накладной)-->            <xs:element name="employeePassToAccount" type="xs:string" minOccurs="0"/>            <!--Номер товарно-транспортной накладной-->            <xs:element name="transportInvoiceNumber" type="xs:string" minOccurs="0"/>            <!--            UUID связанной расходной накладной            (только чтение)            @since 5.4            -->            <xs:element name="linkedOutgoingInvoiceId" type="xs:string" minOccurs="0"/>                         <!--            Алгоритм распределения дополнительных расходов.            (только чтение)            @since 6.0            -->            <xs:element name="distributionAlgorithm" type="distributionAlgorithmType" minOccurs="0"/>        </xs:sequence>    </xs:complexType>     <!--Позиция документа-->    <xs:complexType name="incomingInvoiceItemDto">        <xs:sequence>            <!--            Является дополнительным расходом            (только чтение)            @since 6.0            -->            <xs:element name="isAdditionalExpense" type="xs:boolean" minOccurs="0" default="false"/>             <!--Количество товара в его основных единицах измерения-->            <xs:element name="amount" type="xs:decimal" minOccurs="0"/>            <!--Товар у поставщика (guid)-->            <xs:element name="supplierProduct" type="xs:string" minOccurs="0"/>            <!--Товар у поставщика (артикул). Можно задать вместо guid начиная с 5.0.-->            <xs:element name="supplierProductArticle" type="xs:string" minOccurs="0"/>            <!--Товар (guid). Хотя бы одно из полей должно быть заполнено: product или productArticle.-->            <xs:element name="product" type="xs:string" minOccurs="0"/>            <!--Товар (артикул). Можно задать вместо guid товара начиная с 5.0, guid имеет приоритет.-->            <xs:element name="productArticle" type="xs:string" minOccurs="0"/>            <!--Производитель/импортер. Должен содержаться в списке производителей/импортеров в карточке товара:            Товар - Дополнительная информация - Акогольная декларация - Производитель/Импортер-->            <xs:element name="producer" type="xs:string" minOccurs="0"/>            <!--Номер позиции в документе. Обязательное поле.-->            <xs:element name="num" type="xs:int" minOccurs="1"/>            <!--Фасовка (guid)-->            <xs:element name="containerId" type="xs:string" minOccurs="0"/>            <!--Базовая единица измерения (guid)-->            <xs:element name="amountUnit" type="xs:string" minOccurs="0"/>            <!--Вес единицы измерения-->            <!--!!! Не реализовано !!!-->            <xs:element name="actualUnitWeight" type="xs:decimal" minOccurs="0"/>            <!--            Cумма строки без учета скидки.            Как правило sum == amount * price / container + discountSum + vatSum             -->            <xs:element name="sum" type="xs:decimal" minOccurs="1"/>            <!--Cумма скидки-->            <!--!!! Не реализовано !!!-->            <xs:element name="discountSum" type="xs:decimal" minOccurs="0"/>            <!--            Величина процента НДС и сумма НДС для строки документа.            Если не задана сумма, она вычисляется по проценту.            Если не задан процент, он берется из карточки товара.            Нельзя задать только сумму, не задавая процент.            @since 5.0            -->            <xs:element name="vatPercent" type="xs:decimal" minOccurs="0"/>            <xs:element name="vatSum" type="xs:decimal" minOccurs="0"/>            <!--Цена единицы измерения-->            <xs:element name="priceUnit" type="xs:string" minOccurs="0"/>            <!--Цена за ед.-->            <xs:element name="price" type="xs:decimal" minOccurs="0"/>            <!--            Цена без НДС за фасовку с учетом скидки            @since 6.2            -->            <xs:element name="priceWithoutVat" type="xs:decimal" minOccurs="0"/>            <!--Код-->            <!--!!! Не реализовано !!!-->            <xs:element name="code" type="xs:string" minOccurs="0"/>            <!--Склад-->            <xs:element name="store" type="xs:string" minOccurs="0"/>            <!--Номер государственной таможенной декларации-->            <xs:element name="customsDeclarationNumber" type="xs:string" minOccurs="0"/>            <!--Фактическое (подтвержденное) количество основных единиц товара-->            <xs:element name="actualAmount" type="xs:decimal" minOccurs="0"/>        </xs:sequence>    </xs:complexType>     <xs:simpleType name="documentStatus">        <xs:restriction base="xs:string">            <xs:enumeration value="NEW"/>            <xs:enumeration value="PROCESSED"/>            <xs:enumeration value="DELETED"/>        </xs:restriction>      </xs:simpleType>         <xs:simpleType name="distributionAlgorithmType">        <xs:restriction base="xs:string">            <xs:enumeration value="DISTRIBUTION_BY_SUM"/>            <xs:enumeration value="DISTRIBUTION_BY_AMOUNT"/>            <xs:enumeration value="DISTRIBUTION_NOT_SPECIFIED"/>        </xs:restriction>    </xs:simpleType></xs:schema>

<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xs:schema version="1.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">    <xs:element name="document" type="outgoingInvoiceDto"/>     <xs:complexType name="outgoingInvoiceDto">        <xs:sequence>            <!--            Id документа(только чтение)            @since 5.4            -->            <xs:element name="id" type="xs:string" minOccurs="0"/>            <xs:element name="documentNumber" type="xs:string" minOccurs="0"/>            <!--            Учетная дата-время документа.            Если не заполнено, используется дата-время сервера.            Поддерживаемые форматы:            yyyy-MM-ddTHH:mm:ss, yyyy-MM-dd (dd.MM.yyyy не рекомендуется).            -->            <xs:element name="dateIncoming" type="xs:dateTime" minOccurs="0"/>            <!--            false (по умолчанию): использовать переданные дату-время dateIncoming как есть.            true: использовать настройки проведения документов, заданные в подразделении:             * В режиме "текущее время" - дату и время из dateIncoming;             * "фиксированное время" или "время закрытия кассовой смены" - дату из dateIncoming, а время из настроек.            -->            <xs:element name="useDefaultDocumentTime" type="xs:boolean" minOccurs="0" default="false"/>            <xs:element name="status" type="documentStatus" minOccurs="0"/>            <!-- Счет для списания товаров (расходный счет). По умолчанию "5.01" ("Расход продуктов"). -->            <xs:element name="accountToCode" type="xs:string" minOccurs="0"/>            <!-- Счет выручки. По умолчанию "4.01" ("Торговая выручка"). -->            <xs:element name="revenueAccountCode" type="xs:string" minOccurs="0"/>            <!--            Склад (id или код). При создании накладных с проведением обязателен.            Заполняется либо в документе, либо в каждой строке отдельно, но не одновременно.            Если заполнен в документе, в бекофисе будет отмечена галочка "Отгрузить со склада".            -->            <xs:element name="defaultStoreId" type="xs:string" minOccurs="0"/>            <xs:element name="defaultStoreCode" type="xs:string" minOccurs="0"/>            <!-- Контрагент -->            <xs:element name="counteragentId" type="xs:string" minOccurs="0"/>            <xs:element name="counteragentCode" type="xs:string" minOccurs="0"/>            <!-- Концепция -->            <xs:element name="conceptionId" type="xs:string" minOccurs="0"/>            <xs:element name="conceptionCode" type="xs:string" minOccurs="0"/>            <!-- Комментарий -->            <xs:element name="comment" type="xs:string" minOccurs="0"/>            <!--            UUID связанной расходной накладной            (только чтение)            @since 5.4            -->            <xs:element name="linkedOutgoingInvoiceId" type="xs:string" minOccurs="0"/>            <xs:element name="items">                <xs:complexType>                    <xs:sequence>                        <xs:element name="item" type="outgoingInvoiceItemDto" minOccurs="0" maxOccurs="unbounded"/>                    </xs:sequence>                </xs:complexType>            </xs:element>        </xs:sequence>    </xs:complexType>     <xs:complexType name="outgoingInvoiceItemDto">        <xs:sequence>            <!-- Элемент номенклатуры (id или код (артикул))-->            <xs:element name="productId" type="xs:string" minOccurs="0"/>            <xs:element name="productArticle" type="xs:string" minOccurs="0"/>            <!--            Склад (id или код). При создании накладных с проведением обязателен.            Заполняется либо в документе, либо в каждой строке отдельно, но не одновременно.            -->            <xs:element name="storeId" type="xs:string" minOccurs="0"/>            <xs:element name="storeCode" type="xs:string" minOccurs="0"/>            <!-- Фасовка (id или код(артикул)) -->            <xs:element name="containerId" type="xs:string" minOccurs="0"/>            <xs:element name="containerCode" type="xs:string" minOccurs="0"/>            <!-- Цена за фасовку с учетом скидки -->            <xs:element name="price" type="xs:decimal" minOccurs="1"/>                   <!--            Цена без НДС за фасовку с учетом скидки            (только чтение)            @since 6.2            -->            <xs:element name="priceWithoutVat" type="xs:decimal" minOccurs="0"/>            <!-- Количество в базовых единицах измерения -->            <xs:element name="amount" type="xs:decimal" minOccurs="1"/>            <!--            Cумма строки без учета скидки.            Как правило sum == amount * price / container + discountSum + vatSum             -->            <xs:element name="sum" type="xs:decimal" minOccurs="1"/>            <!-- Cумма скидки -->            <xs:element name="discountSum" type="xs:decimal" minOccurs="0"/>            <!--            Величина процента НДС и сумма НДС для строки документа.            Если не задана сумма, она вычисляется по проценту.            Если не задан процент, он берется из карточки товара.            Нельзя задать только сумму, не задавая процент.            @since 5.0             -->            <xs:element name="vatPercent" type="xs:decimal" minOccurs="0"/>            <xs:element name="vatSum" type="xs:decimal" minOccurs="0"/>        </xs:sequence>    </xs:complexType>     <xs:simpleType name="documentStatus">        <xs:restriction base="xs:string">            <xs:enumeration value="NEW"/>            <xs:enumeration value="PROCESSED"/>            <xs:enumeration value="DELETED"/>        </xs:restriction>    </xs:simpleType></xs:schema>

*XSD Результат валидации документа​
XML
      <productId>FBCC2C7A-9B52-4FDB-8B95-4C9725273DE4</productId>
      <price>30</price>
      <amount>10</amount>
      <sum>300</sum>
      <vatPercent>12</vatPercent>
      <vatSum>32.20</vatSum>
    </item>
  </items>
</document>
Результат

XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<documentValidationResult>
    <valid>false</valid>
    <warning>false</warning>
    <documentNumber>400234</documentNumber>
    <errorMessage>Cannot find document of type INCOMING_INVOICE by number 'TAKT0001' and date '2016-05-01'</errorMessage>
</documentValidationResult>

Выгрузка расходной накладной по ее номеру

### Версия iiko: 5.4

### GET Request
https://host:port/resto/api/documents/export/outgoingInvoice/byNumber

#### Параметры запроса
Название
Значение
Описание
number	String	номер документа
from	YYYY-MM-DD	начальная дата (входит в интервал)
to	YYYY-MM-DD	конечная дата (входит в интервал, время не учитывается)
currentYear	Boolean	только за текущий год
При currentYear = true, вернет документы с указанным номером документа только за текущий год. Параметры from и to должны отсутствовать.

При currentYear = false параметры from и to должны быть указаны.

currentYear — обязательный параметр.

#### Что в ответе

                <productId>dc0c21ce-6ed9-4275-ae94-c6585ebd972a</productId>
                <productArticle>06062</productArticle>
                <storeId>a80f6110-aa36-43ea-8fb7-de9b6a3a2346</storeId>
                <storeCode>16</storeCode>
                <price>166.670000000</price>
                <amount>6.000000000</amount>
                <sum>1000.000000000</sum>
                <discountSum>0.000000000</discountSum>
                <vatPercent>0.000000000</vatPercent>
                <vatSum>0.000000000</vatSum>
            </item>
        </items>
    </document>
</outgoingInvoiceDtoes>

https://host:port/resto/api/documents/import/productionDocument

Content-Type: application/xml

#### Тело запроса
Структура productionDocumentDto

https://localhost:8080/resto/api/documents/import/productionDocument?key=d7474d4a-0a40-d918-85fa-2cd98fddfeb1

XML
<document>
  <!--Со склада (guid)-->
  <storeFrom>1239d270-1bbe-f64f-b7ea-5f00518ef508</storeFrom>
   <!--На склад (guid)-->
  <storeTo>1239d270-1bbe-f64f-b7ea-5f00518ef508</storeTo>
   <!--Дата документа-->
  <dateIncoming>17.12.2014</dateIncoming>
   <!--Номер документа-->
  <documentNumber>api-0002</documentNumber>
   <!--Комментарий-->
  <comment>api test api-0002</comment>
   <items>
       <item>
          <!--Фасовка (guid)-->
          <amountUnit>cd19b5ea-1b32-a6e5-1df7-5d2784a0549a</amountUnit>
           <!--Контейнер (guid)-->
          <containerId>C66196B6-68F2-4C17-97C2-C2008A39A76A</containerId>   
          <!--Порядковый номер в документе-->
          <num>1</num>
          <!--Товар (guid)-->
          <product>0f22aa60-e8ae-4c8e-80cd-f1e00b88fec6</product>
          <!--Количество-->
        <amount>1</amount>
        </item> 
    </items>
  </document>
Результат

XML
HTTP/1.1 200 OK
Server: Apache-Coyote/1.1
Vary: Accept-Encoding
Content-Type: application/xml
Content-Length: 192
Date: Wed, 17 Dec 2014 08:47:50 GMT
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><documentValidationResult>
  <documentNumber>api-0002</documentNumber>
  <valid>true</valid>
  <warning>false</warning>
</documentValidationResult>

              <productId>0f22aa60-e8ae-4c8e-80cd-f1e00b88fec6</productId>
              <productArticle>25753</productArticle>
              <storeId>1239D270-1BBE-F64F-B7EA-5F00518EF508</storeId>
      </item>
      <item>
              <discountSum>22.00</discountSum>
              <sum>220.00</sum>
              <amount>5.00</amount>
              <productId>b2d954ce-fc7a-44ff-9987-35af59f16966</productId>
              <productArticle>25752</productArticle>
              <storeId>153212ad-21af-4eeb-85c0-245822db3a70</storeId>
      </item>
  </items>
  <status>NEW</status>
  <accountToCode>5.01</accountToCode>
  <revenueAccountCode>4.01</revenueAccountCode>
  <documentNumber>api-015</documentNumber>
  <dateIncoming>17.12.2014</dateIncoming>
</document>
Результат

XML
HTTP/1.1 200 OK
Server: Apache-Coyote/1.1
Vary: Accept-Encoding
Content-Type: application/xml
Content-Length: 191
Date: Wed, 17 Dec 2014 09:16:36 GMT

<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<documentValidationResult>
  <documentNumber>api-015</documentNumber>
  <valid>true</valid>
  <warning>false</warning>
</documentValidationResult>

      <productId>F464E4D4-CF9C-49A2-9E18-1227B41A3801</productId>
      <amountContainer>5.0</amountContainer>
    </item>
    <item>
      <productId>C6D6C2F2-7E48-4AC9-84CA-1F566C3A941E</productId>
      <containerId>551E0382-64CA-49F1-B74F-733EBC6902C4</containerId>
      <amountContainer>18.0</amountContainer>
      <comment>Их же было 19?</comment>
    </item>
    <item>
      <productId>C6D6C2F2-7E48-4AC9-84CA-1F566C3A941E</productId>
      <containerId>4D32F56F-89D4-4E2D-8912-3D3593A8284D</containerId>
      <amountContainer>28.0</amountContainer>
    </item>
    <item>
      <productId>C6D6C2F2-7E48-4AC9-84CA-1F566C3A941E</productId>
      <amountContainer>1.0</amountContainer>
    </item>
  </items>
</document>
Результат

XML
<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
            <product>
                <id>c6d6c2f2-7e48-4ac9-84ca-1f566c3a941e</id>
                <code>00001</code>
                <name>Товар с разными фасовками</name>
            </product>
            <expectedAmount>13.600000000</expectedAmount>
            <expectedSum>535.370000000</expectedSum>
            <actualAmount>29.450</actualAmount>
            <differenceAmount>15.850000000</differenceAmount>
            <differenceSum>623.930000000</differenceSum>
        </item>
        <item>
            <product>
                <id>f464e4d4-cf9c-49a2-9e18-1227b41a3801</id>
                <code>00002</code>
                <name>Другой товар</name>
            </product>
            <expectedAmount>5.000000000</expectedAmount>
            <expectedSum>0</expectedSum>
            <actualAmount>4.000</actualAmount>
            <differenceAmount>1.000000000</differenceAmount>
            <differenceSum>0</differenceSum>
        </item>
    </items>
      <productId>F464E4D4-CF9C-49A2-9E18-1227B41A3801</productId>
      <amountContainer>5.0</amountContainer>
    </item>
    <item>
      <productId>C6D6C2F2-7E48-4AC9-84CA-1F566C3A941E</productId>
      <containerId>551E0382-64CA-49F1-B74F-733EBC6902C4</containerId>
      <amountContainer>18.0</amountContainer>
      <comment>Их же было 19?</comment>
    </item>
    <item>
      <productId>C6D6C2F2-7E48-4AC9-84CA-1F566C3A941E</productId>
      <containerId>4D32F56F-89D4-4E2D-8912-3D3593A8284D</containerId>
      <amountContainer>28.0</amountContainer>
    </item>
    <item>
      <productId>C6D6C2F2-7E48-4AC9-84CA-1F566C3A941E</productId>
      <amountContainer>1.0</amountContainer>
    </item>
  </items>
</document>

Результат

XML
<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
            <product>
                <id>c6d6c2f2-7e48-4ac9-84ca-1f566c3a941e</id>
                <code>00001</code>
                <name>Товар с разными фасовками</name>
            </product>
            <expectedAmount>13.600000000</expectedAmount>
            <expectedSum>535.370000000</expectedSum>
            <actualAmount>29.450</actualAmount>
            <differenceAmount>15.850000000</differenceAmount>
            <differenceSum>623.930000000</differenceSum>
        </item>
        <item>
            <product>
                <id>f464e4d4-cf9c-49a2-9e18-1227b41a3801</id>
                <code>00002</code>
                <name>Другой товар</name>
            </product>
            <expectedAmount>5.000000000</expectedAmount>
            <expectedSum>0</expectedSum>
            <actualAmount>4.000</actualAmount>
            <differenceAmount>1.000000000</differenceAmount>
            <differenceSum>0</differenceSum>
        </item>
    </items>
      "productId": "31e6155c-e842-448f-8266-1d05eb8e977a",
      "productSizeId": null,
      "amountFactor": 1,
      "amount": 2,
      "measureUnitId": "6040d92d-e286-f4f9-a613-ed0e6fd241e1",
      "containerId": null,
      "cost": 0                                                
    }
    
  ]
  
}
Выгрузка документов по номеру
        "productId": "31e6155c-e842-448f-8266-1d05eb8e977a",
        "productSizeId": null,
        "amountFactor": 1,
        "amount": 2,
        "measureUnitId": "6040d92d-e286-f4f9-a613-ed0e6fd241e1",
        "containerId": null,
        "cost": 0                                                    
      }
      
    ]
    
  }
  
]
 
Создание/редактирование документа
Для позиций в документе обязательными являются поля 'productId', 'amount'.

Если при создании документа не задано поле 'documentNumber', оно сгенерится автоматически.

JSON
{
  "dateIncoming": "2021-11-16T23:00",
  "status": "NEW",
  "comment": "yyy",
  "storeId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
  "accountId": "8c46f55a-0698-4e3f-8703-8bb36b24e8ac",
  "items": [
    {
      "productId": "50cedffc-04e9-aa79-016b-d1f9c56122e8",
      "amount": 1                                                                        
    }
    
  ]
  
}
#### Пример запроса и результат
Запрос
        "productId": "50cedffc-04e9-aa79-016b-d1f9c56122e8",
        "productSizeId": null,
        "amountFactor": 1,
        "amount": 1,
        "measureUnitId": "6040d92d-e286-f4f9-a613-ed0e6fd241e1",
        "containerId": null,
        "cost": null                                                                            
      }
      
    ]
    
  }
  
}

      "productId": "ccdada6c-1643-4c52-9e09-752a4de117a0",
      "amount": 20,
      "measureUnitId": "cd19b5ea-1b32-a6e5-1df7-5d2784a0549a",
      "containerId": "e2e67737-18bf-437b-8230-8ec17da75096",
      "cost": null                                                
      
    }
    
  ]
  
}
 

Выгрузка документов по номеру
        "productId": "ccdada6c-1643-4c52-9e09-752a4de117a0",
        "amount": 20,
        "measureUnitId": "cd19b5ea-1b32-a6e5-1df7-5d2784a0549a",
        "containerId": "e2e67737-18bf-437b-8230-8ec17da75096",
        "cost": null                                                    
      }
      
    ]
    
  }
  
]

Создание/редактирование документа
Для позиций в документе обязательными являются поля 'productId', 'amount'.

Если при создании документа не задано поле 'documentNumber', оно сгенерится автоматически.

JSON
{
  "id": "0fd6f4ad-4858-401c-017d-22eacb7101a7",
  "dateIncoming": "2021-11-15T06:00",
  "documentNumber": "30002",
  "status": "NEW",
  "comment": "zzz",
  "storeFromId": "05a407d4-d7c6-4bc2-a578-6ad5de99d468",
  "storeToId": "370620fe-c789-46db-9d92-33bec29b82a3",
  "items": [
    {
      "productId": "ccdada6c-1643-4c52-9e09-752a4de117a0",
      "amount": 5,
      "containerId": "e2e67737-18bf-437b-8230-8ec17da75096"                                                                        
    },
    {
      "productId": "8972b757-4e08-4c50-a145-80cd12bb4f1e",
      "amount": 5,
      "containerId": "84d13550-d3c8-4f73-8e35-2ae470260bdc"                                                                        
    }
    
  ]
  
}

#### Пример запроса и результата
Запрос
        "productId": "ccdada6c-1643-4c52-9e09-752a4de117a0",
        "amount": 5,
        "measureUnitId": "cd19b5ea-1b32-a6e5-1df7-5d2784a0549a",
        "containerId": "e2e67737-18bf-437b-8230-8ec17da75096",
        "cost": null                                                                            
      },
      {
        "num": 2,
        "productId": "8972b757-4e08-4c50-a145-80cd12bb4f1e",
        "amount": 5,
        "measureUnitId": "cd19b5ea-1b32-a6e5-1df7-5d2784a0549a",
        "containerId": "84d13550-d3c8-4f73-8e35-2ae470260bdc",
        "cost": null                                                                            
      }
      
    ]
    
  }
  
}

группа проводок:

CARD (безнал)
CREDIT (кредит)
product
id элемента номенклатуры для фильтрации (необязательный, можно указать несколько)
#### Что в ответе
Возвращает количественные (amount) и денежные (sum) остатки товаров (product) на складах (store) на заданную учетную дату-время.

См. ниже пример результата.

#### Пример запроса и результата
Запрос 

        "product": "f464e4d4-cf9c-49a2-9e18-1227b41a3801",
        "amount": 123,
        "sum": 64083
    },
    {
        "store": "1239d270-1bbe-f64f-b7ea-5f00518ef508",
        "product": "c6d6c2f2-7e48-4ac9-84ca-1f566c3a941e",
        "amount": 29.45,
        "sum": 1159.3
    },
    {
        "store": "1239d270-1bbe-f64f-b7ea-5f00518ef508",
        "product": "f464e4d4-cf9c-49a2-9e18-1227b41a3801",
        "amount": 15,
        "sum": 1221
    }
]

Если начальный остаток необходим, оставляйте в этом OLAP-запросе только те поля группировки, по которым он действительно необходим (как правило, это  Account.Name и Product.Name), и вызывайте такой запрос как можно реже и в не рабочее время.
