# iiko Server API (ru.iiko.help) — выгрузка

Источник: https://ru.iiko.help/articles/#!api-documentations/iikoserver-api

Облачные системы с открытым API всегда имеют ограничения по использованию, чтобы предоставлять клиентам максимально надежный и стабильный сервис. 

Ниже находится список ограничений для работы с iikoServer: 

Запросы должны выполнятся последовательно друг за другом. Каждый следующий запрос должен быть отправлен только после того, как выполнился предыдущий запрос.
Запрашивайте данные за период не длиннее одного месяца, в идеале — за один день или неделю. 
Если вам не нужны общие результаты в OLAP-отчетах, указывайте в запросе значение параметра build-summary=false. Для крупных сетей значение build-summary=true может привести к зависанию сервера.
При построении OLAP-отчета рекомендуется использовать не более 7 полей.
Перед выполнением запросов на сервере клиента проверяйте их на демо-сервере.


Принципы работы
Отдельные сущности представляются в виде XML-документа. XML схема каждой сущности представлена в приложении.
Списки сущностей представлены в виде XML-документа, корневой элемент которого содержит XML-элементы, представляющие сущности.
Создание и изменение сущностей методом POST осуществляется передачей в качестве параметров запроса аттрибутов сущности. Таким образом возможно внесение изменений лишь в определённые поля без передачи неизменяемых значений. В заголовке запроса должен быть указан: Content-Type: application/x-www-form-urlencoded
Создание и изменение сущностей методом PUT осуществляется передачей в теле запроса самой сущности. Аттрибуты сущности, отсутствующие в теле запроса, примут значение по-умолчанию в случае создания сущности и сохранят свои значения в случае обновления. В заголовке запроса необходимо указывать : Content-Type: application/xml
При успешном создании сущности будет возвращён ответ с HTTP-статусом 201 (Created).
При успешном обновлении сущности будет возвращён ответ с HTTP-статусом 200 (OK).

Авторизация
POST Request	 https://host:port/resto/api/auth?login=[login]&pass=[sha1passwordhash]
Пример запроса

https://localhost:8080/resto/api/auth?login=admin&pass=2155245b2c002a1986d3f384af93be813537a476

Параметры запроса

Параметр
Описание
login

Логин пользователя


pass


SHA1 hash от пароля

в bash его можно получить так: printf "resto#test" | sha1sum


Что в ответе 

Строка-токен, который необходимо передавать как cookie с именем key или как параметр key всех запросов.

Начиная с 4.3 сервер сам устанавливает cookie key.


Выход
POST Request	  https://host:port/resto/api/logout?key=[token]
Что в ответе 

Строка-токен, полученная при авторизации. 

Пример запроса

https://localhost:8080/resto/api/logout?key=b354d18c-3d3a-e1a6-c3b9-9ef7b5055318

https://localhost:8080/resto/api/logout c cookie key=c0508074-a052-6276-bf72-871f7acb865e

Описание ошибок
Любой метод серверного REST API v1 и REST API v2 вместо ответа в задокументированном формате может вернуть одну из следующих ошибок с телом text/plain:

HTTP code
Значение, описание, параметры
Ожидаемое поведение клиента/интеграции
403	
Доступ запрещён (аутентифицирован, но нет прав):

На сервере нет лицензии на данный API или подсистему API (сотрудников, событий...)
(Module %s is blocked within current license)
Превышено разрешенное количество подключений к API или подсистеме API
(License enhancement is required: no connections available for module %s)
У вошедшего пользователя нет прав, требуемых конкретным модулем API
(Permission denied)
Уведомить пользователя (внимание: текст ошибки не локализован) 
400	
Либо ошибка в запросе (параметры не того типа, ошибки десериализации), либо внутренняя ошибка, связанная с неполнотой полученных в запросе, либо хранящихся в базе данных:

Wrong date format: 2019-0513 15:26
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
 
1)Получить кол-во свободных слотов для конкретного лицензионного модуля можно запросом http://localhost:8080/resto/api/licence/info?moduleId=28008806

Все тело ответа в формате Content-type: text/plain является текстом ошибки, который рекомендуется вывести пользователю (при получении статуса 409) и записать в свой лог для упрощения поддержки (при получении любого http-статуса). Тип ответа, содержащий html (text/html, text/xhtml и т.п), говорит о сетевой ошибке или ошибке настройки сервера (опечатка в URL, ошибка DNS, ошибка настроек прокси, "пустой" Tomcat без сервера RMS/Chain и т.п.), реже о рестарте сервера.

Если выше не указано явно (в частности, код 409), текст ошибки не локализован и может содержать технические детали (UUID-ы затронутых объектов).

Текст может содержать обязательные переносы строк, то есть, рассчитан на вывод в режиме CSS "white-space: pre-line;".

Текст не экранирован и может содержать "опасные" для js, html, sql, etc символы.

Лог сервера (full.log, access.csv) может содержать больше информации, чем доступно пользователю API. Это включает в себя не только детали произошедших ошибок/отказов, но и "предупреждений" (WARN).

Получение элементов номенклатуры
Чтобы пользоваться API экспорта и импорта номенклатуры:

У пользователя, под чьим именем осуществляется вход, должно быть право B_EN "Редактирование номенклатурных справочников".
Версия iiko: 6.1

GET Request	https://host:port/resto/api/v2/entities/products/list
Параметры запроса
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
Что в ответе


Список элементов номенклатуры.

[+] Список ProductDto
Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/list?includeDeleted=false

[+] Результат

[+] Список ProductGroupDto
Получение элементов номенклатуры 
Версия iiko: 6.4

POST Request	https://host:port/resto/api/v2/entities/products/list
Тело запроса
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
 
Что в ответе


Список элементов номенклатуры.

Импорт элемента номенклатуры
Версия iiko: 6.1

POST Request	https://host:port/resto/api/v2/entities/products/save
Параметры запроса
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
Что в ответе
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
Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/save

[+] Результат
[+] Пример успешного результата вызова API: entities/products/save
[+] Пример НЕ успешного результата вызова API: entities/products/save
Редактирование элемента номенклатуры
Версия iiko: 6.1

POST Request	https://host:port/resto/api/v2/entities/products/update
Параметры запроса
Название	Тип, формат	Описание
overrideFastCode	Boolean	Перегенерировать ли код быстрого поиска элемента номенклатуры.
По умолчанию false.
overrideNomenclatureCode	Boolean	Перегенерировать ли артикул элемента номенклатуры.
По умолчанию false.
Тело запроса
Аналогично импорту только с id редактируемого элемента
Поле
Тип данных
Значение
id	UUID	UUID редактируемого элемента номенклатуры
[+] Тело запроса
Что в ответе
Содержит Json структуру результата изменения, которая состоит из результата валидации измененного элемента
и самого элемента. Результат валидации состоит из ошибок. Ошибка состоит из кода ошибки и текста ошибки.


Примеры запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/update?overrideFastCode=false&overrideNomenclatureCode=false

[+] Результат
[+] Пример успешного результата вызова API: entities/products/update
[+] Пример НЕ успешного результата вызова API: entities/products/update


Удаление элементов номенклатуры
Версия iiko: 6.1

POST Request	https://host:port/resto/api/v2/entities/products/delete
Тело запроса
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
Что в ответе
Содержит Json структуру результата удаления.

Примеры запроса и результат
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
Версия iiko: 6.1

POST Request	https://host:port/resto/api/v2/entities/products/restore
Параметры запроса
Параметр	Версия
Тип, формат	Описание
overrideNomenclatureCode	6.4
Boolean	
Если у восстанавливаемого продукта артикул совпадает с одним из текущих и параметр указан равным true, то у восстанавливаемого продукта будет сгенерирован новый артикул.

Необязательный. По умолчанию false.

Тело запроса

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
Что в ответе

Содержит Json структуру результата восстановления.

Пример запроса и результата
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
Версия iiko: 6.2

GET Request	https://host:port/resto/api/v2/entities/products/group/list
Параметры запроса
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
Что в ответе
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
Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/group/list?includeDeleted=false


[+] Результат
Получение номенклатурных групп 
Версия iiko: 6.4

POST Request	https://host:port/resto/api/v2/entities/products/group/list
Тело запроса
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
Что в ответе


Список номенклатурных групп

Импорт номенклатурной группы
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/entities/products/group/save
Параметры запроса
Параметр	Тип, формат	Описание
generateNomenclatureCode	Boolean	
Надо ли генерировать артикул номенклатурной группы.

Необязательный. По умолчанию true.

generateFastCode	Boolean	
Надо ли генерировать код быстрого поиска номенклатурной группы.

Необязательный. По умолчанию true.

Тело запроса
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
Что в ответе
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
Пример запроса и результата
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
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/entities/products/group/update
Параметры запроса

Параметр	Тип, формат	Описание
overrideFastCode	Boolean	
Перегенерировать ли код быстрого поиска номенклатурной группы.

Необязательный. По умолчанию false

overrideNomenclatureCode	Boolean	
Перегенерировать ли артикул номенклатурной группы.

Необязательный. По умолчанию false.

Тело запроса
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

Что в ответе


Содержит Json структуру результата изменений, которая состоит из результата валидации измененной группы
и самой группы. Результат валидации состоит из ошибок. Ошибка состоит из кода ошибки и текста ошибки. 

Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/entities/products/update?overrideFastCode=false&overrideNomenclatureCode=false

[+] Результат
[+] Пример успешного результата вызова API: entities/products/update
[+] Пример НЕ успешного результата вызова API: entities/products/update
Удаление номенклатурной группы
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/entities/products/group/delete
Тело запроса
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
Что в ответе
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

Пример запроса и результата
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
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/entities/products/group/restore
Параметры запроса
Параметр	Версия iiko
Тип, формат	Описание
overrideNomenclatureCode	6.4
Boolean	
Если у восстанавливаемого группы артикул совпадает с одним из текущих и параметр указан равным true, то у восстанавливаемого группы будет сгенерирован новый артикул.

Необязательный. По умолчанию false.

Тело запроса
ProductsAndGroupsDto<IdListDto IdListDto>

Поле	Тип данных	Значение
products	IdListDto	Список UUID продуктов, которые нужно удалить.
productGroups	IdListDto	Список UUID групп, которые нужно удалить.
Что в ответе


Содержит Json структуру результата восстановления. Нельзя восстановить НЕ удаленные объекты.
Так же нельзя восстановить группу без восстановления родительской группы, если та удалена. 


Пользовательские категории
Получение пользовательских категорий (GET)
Версия iiko: 6.2

GET Request	https://host:port/resto/api/v2/ entities/products/category/list
Параметры запроса
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
Что в ответе
Список пользовательских категорий



Пример запроса и результат
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
Версия iiko: 6.4

POST Request	https://host:port/resto/api/v2/entities/products/category/list
Параметры запроса
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

Что в ответе

Список пользовательских категорий


Импорт пользовательской категории
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/entities/products/category/save
Тело запроса
Поле	Тип данных	Значение
name	String	Имя категории.
Что в ответе

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
Примеры запроса и результат
Запрос
https://localhost:8080/resto/api/v2/entities/products/category/save

Результат
JSON
{  
   "name":"Категория 1"
}
Пример успешного результата вызова API: entities/products/category/save


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
Пример НЕ  успешного результата вызова API: entities/products/category/save

Category name is not specified or consist of whitespaces 



Редактирование пользовательской категории
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/entities/products/category/update
Тело запроса
Поле	Тип данных	Значение
id	UUID	UUID редактируемой категории.
name	String	Новое имя категории.
Что в ответе

Json структура результата редактирования. 

Пример запроса и результат
Запрос 
https://localhost:8080/resto/api/v2/entities/products/category/save

Результат
JSON
{ 
   "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137",
   "name":"Категория 2"
}
Пример успешного результата вызова API: entities/products/category/update


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
Пример НЕ успешного результата вызова API: entities/products/category/update

Category name is not specified or consist of whitespaces

 

Удаление пользовательской категории
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/entities/products/category/delete
Тело запроса
Поле	Тип данных	Значение
id	UUID	UUID удаляемой категории.
Что в ответе

Json структура результата удаления.  Содержит результат удаления. Нельзя удалить уже удаленные объекты.  

Пример запроса и результат
Запрос  
https://localhost:8080/resto/api/v2/entities/products/category/delete

Результат
JSON
{ 
   "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137" 
}
Пример успешного результата вызова API: entities/products/category/delete


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
Пример НЕ успешного результата вызова API: entities/products/category/save

Could not delete already deleted product category: [7e29cd73-05da-7ac4-0165-0f11a132002b].




Восстановление пользовательской категории
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/entities/products/category/restore
Тело запроса
Поле	Тип данных	Значение
id	UUID	UUID восстанавливаемой категории.
Что в ответе

Json структура результата восстановления.  Содержит результат восстановления. Нельзя восстановить НЕ удаленные объекты.

Примеры запроса и результат
Запрос
http://localhost:8080/resto/api/v2/entities/products/category/restore

Результат
JSON
{ 
   "id":"70936cd4-474d-4b5f-b9bc-ac2799bfc137" 
}
Пример успешного результата вызова API: entities/products/category/restore


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
Пример НЕ успешного результата вызова API: entities/products/category/restore
Could not restore not deleted product category: [70936cd4-474d-4b5f-b9bc-ac2799bfc137]​.

Технологические карты
Технологические карты (рецепты) в iiko строго привязаны к элементам номенклатуры (блюдам, модификаторам, заготовкам) и датам: на каждый учетный день элементу номенклатуры может быть сопоставлено не более одной технологической карты. Единственная сопоставленная карта должна задавать метод списания (целиком/по ингредиентам) и состав + количество ингредиентов для всех действующих и удаленных подразделений, размеров блюд.

Ингредиентом блюда, модификатора, заготовки может быть заготовка, имеющая свою собственную технологическую карту. Таким образом, техкарты образуют деревья.

Статья по настройке технологических карт. 

Получение всех технологических карт (getAll)
Версия iiko: 6.0

GET Request	https://host:port/resto/api/v2/assemblyCharts/getAll?dateFrom={dateFrom}&dateTo={dateTo}&includeDeletedProducts=true&includePreparedCharts=false
Параметры запроса
Параметр	Тип, формат	Описание
dateFrom	yyyy-MM-dd	Учетный день, начиная с которого требуются техкарты. Обязательный параметр.
dateTo	yyyy-MM-dd	Учетный день, начиная с которого техкарты не требуются. Если не задан, возвращаются все будущие техкарты.
includeDeletedProducts	Boolean	Включать ли в результат техкарты для удаленных блюд. По умолчанию true.
includePreparedCharts	Boolean	Включать ли в результат техкарты, разложенные до конечных ингредиентов. По умолчанию false (их может быть много).
Что в ответе
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
Пример запроса и результат
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
Версия iiko: 6.0

GET Request	https://host:port/resto/api/v2/assemblyCharts/getAllUpdate?knownRevision={knownRevision}&dateFrom={dateFrom}&dateTo={dateTo}&includeDeletedProducts=true&includePreparedCharts=false
Параметры запроса 
Параметр	Тип, формат	Описание
knownRevision	Integer	Значение поля knownRevision из предыдущего результата вызова getAll или getAllUpdate с теми же параметрами.
dateFrom	yyyy-MM-dd	Учетный день, начиная с которого требуются техкарты. Обязательный параметр.
dateTo	yyyy-MM-dd	Учетный день, начиная с которого техкарты не требуются. Если не задан, возвращаются все техкарты, включая будущие.
includeDeletedProducts	Boolean	Включать ли в результат техкарты для удаленных блюд. По умолчанию true. Получение обновлений не поддерживается для false.
includePreparedCharts	Boolean	Включать ли в результат техкарты, разложенные до конечных ингредиентов. По умолчанию false (их может быть много).
Что в ответе
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
Пример запроса и результат
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
Версия iiko: 6.0

GET Request	https://host:port/resto/api/v2/assemblyCharts/getTree?date={date}&productId={productId}&departmentId={departmentId}
Параметры запроса
Параметр	Тип, формат	Описание
departmentId	UUID	UUID подразделения. Если не указан, возвращается технологическая карта со строками, действующими в любом из подразделений, клиент должен сам анализировать применимость (поле items.storeSpecification).
productId	UUID	UUID элемента номенклатуры (блюда, модификатора, заготовки) (обязательно)
date	yyyy-MM-dd	Учетный день
Что в ответе
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
Пример запроса и результат
Запрос
https://localhost:8080/resto/api/v2/assemblyCharts/getTree?date=2019-01-01&productId=db54eef3-8db9-4ede-93bc-c849b9d9b33d&departmentId=bc367d9e-4876-4bb1-9b31-2d332387bc5b

[+] ChartResultDto (дерево техкарт)


Получение исходной технологической карты для элемента номенклатуры (getAssembled)
Версия iiko: 6.0

GET Request	https://host:port/resto/api/v2/assemblyCharts/getAssembled?date={date}&productId={productId}&departmentId={departmentId}
Параметры запроса
Параметр	Тип, формат	Описание
date	yyyy-MM-dd	Учетный день
productId	UUID	UUID элемента номенклатуры (блюда, модификатора, заготовки) (обязательно)
departmentId	UUID	UUID подразделения. Если не указан, возвращается технологическая карта со строками, действующими в любом из подразделений, клиент должен сам анализировать применимость (поле items.storeSpecification).
Что в ответе
Первый уровень актуальной технологической карты (json-структура ChartResultDto, содержащая не более одного элемента в списке assemblyCharts: AssemblyChartDto)

[+] Результат (AssemblyChartDto)
Пример запроса и результат
Запрос
https://localhost:8080/resto/api/v2/assemblyCharts/getAssembled?date=2019-01-01&productId=db54eef3-8db9-4ede-93bc-c849b9d9b33d&departmentId=bc367d9e-4876-4bb1-9b31-2d332387bc5b

[+] AssemblyChartDto


Получение технологической карты элемента номенклатуры, разложенной до конечных ингредиентов (getPrepared)
Версия iiko: 6.0

GET Request	https://host:port/resto/api/v2/assemblyCharts/getPrepared?date={date}&productId={productId}&departmentId={departmentId}
Параметры запроса
Параметр Тип, формат Описание date yyyy-MM-dd Учетный день productId UUID UUID элемента номенклатуры (блюда, модификатора, заготовки) (обязательно) departmentId UUID UUID подразделения. Если не указан, возвращается технологическая карта со строками, действующими в любом из подразделений, клиент должен сам анализировать применимость (поле items.storeSpecification).
[+] Результат (PreparedChartDto)
Пример запроса и результат
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
    "effectiveDirectWriteoffStoreSpecification" : {
      "departments" : [ ],
      "inverse" : false
    },
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
GET Request	https://host:port/resto/api/v2/assemblyCharts/byId
Параметры запроса

Параметр	Тип	Обязательный
Описание
id
UUID	да
UUID технологической карты
Что в ответе
Технологическая карта


Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/assemblyCharts/byId?id=B86DA805-9512-44A7-85CA-5DE94272CE07

[+] Результат
 
Получение истории техкарт по продукту (getHistory)
GET Request	https://host:port/resto/api/v2/assemblyCharts/getHistory
Параметры запроса

Параметр	Тип	Обязательный
Описание
productId	UUID	да
UUID приготавливаемого элемента номенклатуры (блюда, модификатора, заготовки)
departmentId	UUID	да
UUID подразделения. Если не указан, возвращается технологическая карта со строками, действующими в любом из подразделений.
Что в ответе
Список всех тех.карт приготавливаемого элемента номенклатуры.

Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/assemblyCharts/getHistory?productId=A00A470C-6CC9-4B7F-835F-393E41AF8FCF

[+] Результат
Создание технологической карты
Версия iiko: 6.4

POST Request	https://host:port/resto/api/v2/assemblyCharts/save
[+] Тело запроса
Пример Body


XML
{
    "assembledProductId": "31e6155c-e842-448f-8266-1d05eb8e977a",
    "dateFrom": "2019-04-01",
    "dateTo": null,
    "assembledAmount": 2,
    "productWriteoffStrategy": "ASSEMBLE",
    "effectiveDirectWriteoffStoreSpecification": {
        "departments": [],
        "inverse": false
    },
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

Что в ответе
Созданная тех. карта. 


Пример запроса и результат
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
        "effectiveDirectWriteoffStoreSpecification": {
            "departments": [],
            "inverse": false
        },
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
Версия iiko: 6.4

POST Request	https://host:port/resto/api/v2/assemblyCharts/delete 
Тело запроса
Поле	Тип
Описание
id	UUID	UUID технологической карты
Пример Body


Код
{
    "id": "8cb98504-c000-ede1-016a-9371e3240031"
}
Что в ответе

UUID удалённой технологической карты 


Пример запроса и результат

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

Примеры

{"departments" : ["3f896777-4560-45f7-a7b0-28b4bf0d6a36", "f636376d-e871-49ad-8281-65259f29aab5"], "inverse" : false}, — только в двух указанных подразделениях.

{"departments" : ["3f896777-4560-45f7-a7b0-28b4bf0d6a36"], "inverse" : true}, — во всех подразделениях, кроме одного, включая подразделения, созданные после сохранения техкарты.

{"departments" : [], "inverse" : true}, — общая строка для всех подразделений, включая созданные после сохранения техкарты (то есть, версионирование технологических карт отсутствует).


Работа с изображениями
Выгрузка изображения
Версия iiko: 6.2

GET Request	https://host:port/resto/api/v2/images/load?imageId={imageId}
Параметры запроса
Параметр
Тип, формат
Описание
imageId	UUID	UUID запрашиваемого изображения. 
Что в ответе
Выгружено изображение.


Поле
Версия iiko
Тип данных
Описание
id	6.2	UUID	UUID изображения.
data	6.2	byte[]	
Изображение в Base64.

Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/images/load?imageId=567791bd-7881-4bcf-8f84-138ca9d0f53c

[+] Результат
Импорт изображений
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/images/save
Тело запроса
Поле
Версия iiko
Тип данных
Значение
id	6.2
byte[]	Изображение в Base64.
Размер изображения не должен превышать
максимальный размер установленный в настройках сервера.
Настройка "saved-image-max-size-mb". По умолчанию 512Мб. 
Что в ответе
Json структура результата импорта.


Результат
Поле	Тип данных	Значение
result	Enum:
"SUCCESS",
"ERROR"	Результата операции.
errors	List<ErrorDto>	
Список ошибок, не позволивших сделать успешный импорт документа.

response	ImageDto	Cохраненное изображение.
Пример запроса и результата
Запрос
https://localhost:8080/resto/api/v2/images/save

[+] Результат
Удаление изображений
Версия iiko: 6.2

POST Request	https://host:port/resto/api/v2/images/delete
Тело запроса
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
Пример запроса и результата
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
GET Request	https://host:port/resto/api/v2/entities/productScales
Параметры запроса
Параметр
Тип
Описание
ids	List<UUID>	Включать ли в ответ удаленные элементы. По умолчанию false.
includeDeleted
Boolean
Включать ли в ответ удаленные элементы. По умолчанию false.
Что в ответе
Список шкал с размерами


Пример запроса и результат 
Запрос 
https://localhost:8080/resto/api/v2/entities/productScales?includeDeleted=true&ids=64efc54c-ad17-4923-9d94-2720822fdd7e&ids=f56f3600-c883-495e-93dd-298219a416e4

[+] Результат


Получение шкал размеров (POST) 
POST Request	https://host:port/resto/api/v2/ entities/productScales  
Тело запроса
Content-Type: application/x-www-form-urlencoded

Параметр
Тип
Описание
ids	List<UUID>	Возвращаемые шкалы размеров должны иметь id из этого списка.
includeDeleted
Boolean
Включать ли в ответ удаленные элементы. По умолчанию false.
Что в ответе
Шкала размеров

Получение шкалы размеров по id 
GET Request	https://host:port/resto/api/v2/entities/productScales/{productScaleId} 
Параметры запроса

Параметр
Тип
Описание
productScaleId 	UUID 	UUID шкалы.
Что в ответе 
Шкала с размерами


Пример запроса и результат 
Запрос 
https://localhost:8080/resto/api/v2/entities/productScales/64efc54c-ad17-4923-9d94-2720822fdd7e


[+] Результат


Создание шкалы 
POST Request	https://host:port/resto/api/v2/entities/productScales/save 
Тело запроса 
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
Что в ответе 
Созданная шкала с размерами. 

Пример запроса и результат 
Запрос 
https://localhost:8080/resto/api/v2/entities/productScales/save


[+] Результат
Редактирование шкалы 
POST Request	https://host:port/resto/api/v2/entities/productScales/update
Тело запроса

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
Что в ответе
Отредактированная шкала с размерами


Удаление шкал 
POST Request	https://host:port/resto/api/v2/entities/productScales/delete 
Тело запроса

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

Что в ответе
Удалённая шкала с размерами 

Пример запроса и результат 
Запрос 
https://localhost:8080/resto/api/v2/entities/productScales/delete


[+] Результат


Восстановление шкал 
POST Request	https://host:port/resto/api/v2/entities/productScales/restore 
Тело запроса

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

Что в ответе
Восстановленная шкала с размерами 

Пример запроса и результат 
Запрос
https://localhost:8080/resto/api/v2/entities/productScales/restore


[+] Результат


Получение шкалы с коэффициентами и доступностью размеров 
GET Request	https://host:port/resto/api/v2/entities/products/{productId}/productScale  
Параметры запроса
Параметр
Тип
Описание
productId 	UUID 	UUID продукта. 
Что в ответе 
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
Примеры запроса и результат 
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
GET Request	
https://host:port/resto/api/v2/entities/products/productScales  

Параметры запроса 
Чтобы задать UUID для нескольких продуктов используем параметр productId несколько раз. 

Параметр
Тип
Описание
includeDeletedProducts	Boolean
Включать ли в результат шкалы для удалённых продуктов. По умолчанию - false.
productId
UUID
UUID продукта. Если не задать, то возвращаются шкалы для всех не удалённых продуктов.

Что в ответе 
Список пар (productId : шкала)

Пример запроса и результат 
https://localhost:8080/resto/api/v2/entities/products/productScales?productId=f928e371-81ac-409d-86d7-0ebb16fb1223&productId=c5016116-d4cf-4afe-998e-0059fc0964f2

[+] Результат


Получение шкал с коэффициентами и доступностью размеров по списку продуктов (POST) 
 
POST Request	https://host:port/resto/api/v2/entities/products/productScales  
Параметры запроса
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

Что в ответе 
Список пар (productId : шкала)

Задание/редактирование шкалы с доступностью и коэффициентами для размеров 
POST Request	https://host:port/resto/api/v2/entities/products/{productId}/productScale
Параметры запроса 
Параметр
Тип, формат
Описание
productId 	UUID
UUID продукта
Тело запроса 
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

Что в ответе 
Шкала с коэффициентами и доступностью размеров

Пример запроса и результат 
Запрос
https://localhost:8080/resto/api/v2/entities/products/f928e371-81ac-409d-86d7-0ebb16fb1223/productScale

[+] Результат


Удаление шкалы размеров у продукта 
DELETE Request	https://host:port/resto/api/v2/entities/products/{productId}/productScale 
Параметры запроса 
Параметр
Тип, формат
Описание
productId 	UUID
UUID продукта
 
Что в ответе
UUID шкалы


Загрузка и редактирование приходной накладной
Версия iiko: 3.9 (редактирование с 5.2)

POST Request	
https://host:port/resto/api/documents/import/incomingInvoice

Content-Type: application/xml
Тело запроса
Формат даты по полям метода загрузки приходной накладной:
<dateIncoming>dd.mm.YYYY</dateIncoming>
<dueDate>dd.mm.YYYY</dueDate>
<incomingDate>YYYY-mm-dd</incomingDate>

[+] XSD Приходная накладная
Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа
Пример расчета количества и цены товара:

При формировании приходной накладной есть позиция с продуктом в ящиках с базовыми единицами в кг.


Например, 5 ящиков по 1000 руб каждый, и в каждом ящике по 10 кг. Тогда заполнятся следующие поля:

"в ед." (<amount>) - 5*10= 50

"Фактическое количество" (<actualAmount>)  - 5*10=50/documents/export/incomingInvoice

"Цена базовой единицы" (<price>) - 1000/10=100 

Если фасовки нет, то эти поля заполняются количеством товара в единицах измерения.

Пример запроса и результата 
Запрос

https://localhost:8080/resto/api/documents/import/incomingInvoice?key=ddb22676-38a7-afb4-d02a-d5f6898d64cc

XML


<document>
  <items>
    <item>
      <amount>3.00</amount>
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
Версия iiko: 4.4

POST Request	
https://host:port/resto/api/documents/import/outgoingInvoice

Content-Type: application/xml
Тело запроса
Структура outgoingInvoiceDto 



[+] XSD Расходная накладная
Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа​
Пример запроса и результат

Запрос


XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<document>
    <documentNumber>400234</documentNumber>
    <dateIncoming>2015-02-25T00:12:34</dateIncoming>
    <useDefaultDocumentTime>true</useDefaultDocumentTime>
    <revenueAccountCode>4.01</revenueAccountCode>
    <counteragentId>48ae3720-abe9-5637-014f-7420d2640125</counteragentId>
    <items>
        <item>
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
Версия iiko: 7.7

POST Request	
https://host:port/resto/api/documents/unprocess/incomingInvoice

Тело запроса
Структура document (см. XSD Приходная накладная)

Что в ответе
Структура documentValidationResult (см. XSD Результат валидации документа)


Распроведение расходной накладной
Версия iiko: 7.7

POST Request	
https://host:port/resto/api/documents/unprocess/outgoingInvoice

Тело запроса
Структура outgoingInvoiceDto (см. XSD Расходная накладная)

Что в ответе
Структура documentValidationResult (см. XSD Результат валидации документа)

XSD Приходная накладная 
XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xs:schema version="1.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">    <xs:element name="document" type="incomingInvoiceDto"/>     <xs:complexType name="incomingInvoiceDto">        <xs:sequence>            <!--Позиции документа-->            <xs:element name="items" minOccurs="0">                <xs:complexType>                    <xs:sequence>                        <xs:element name="item" type="incomingInvoiceItemDto" minOccurs="0" maxOccurs="unbounded"/>                    </xs:sequence>                </xs:complexType>            </xs:element>            <!--            Id документа (только чтение)            @since 5.4            -->            <xs:element name="id" type="xs:string" minOccurs="0"/>            <!--Концепция (guid)-->            <xs:element name="conception" type="xs:string" minOccurs="0"/>            <!--            Код концепции.            @since 7.8            -->            <xs:element name="conceptionCode" type="xs:string" minOccurs="0"/>            <!--Комментарий-->            <xs:element name="comment" type="xs:string" minOccurs="0"/>            <!--Учетный номер документа-->            <xs:element name="documentNumber" type="xs:string" minOccurs="0"/>            <!--            Дата документа.            Поддерживаемые форматы:            yyyy-MM-ddTHH:mm:ss, yyyy-MM-dd (dd.MM.yyyy не рекомендуется).            -->            <xs:element name="dateIncoming" type="xs:string" minOccurs="0"/>            <!--Номер счет-фактуры.-->            <xs:element name="invoice" type="xs:string" minOccurs="0"/>            <!--Склад. Если указан, то в каждой позиции накладной нужно указать этот же склад.-->            <xs:element name="defaultStore" type="xs:string" minOccurs="0"/>            <!--Поставщик-->            <xs:element name="supplier" type="xs:string" minOccurs="0"/>            <!--            Срок оплаты.            Поддерживаемые форматы:            yyyy-MM-ddTHH:mm:ss (dd.MM.yyyy не рекомендуется)            -->            <xs:element name="dueDate" type="xs:string" minOccurs="0"/>            <!--            Входящая дата внешнего документа в формате yyyy-MM-dd.            Если при импорте не указана, то берется из dateIncoming.            @since 7.6.1            -->            <xs:element name="incomingDate" type="xs:string" minOccurs="0"/>            <!--            false (по умолчанию): использовать переданные дату-время dateIncoming как есть.            true: использовать настройки проведения документов, заданные в подразделении:             * В режиме "текущее время" - дату и время из dateIncoming;             * "фиксированное время" или "время закрытия кассовой смены" - дату из dateIncoming, а время из настроек.            @since 5.2            -->            <xs:element name="useDefaultDocumentTime" type="xs:boolean" minOccurs="0" default="false"/>            <xs:element name="status" type="documentStatus" minOccurs="0"/>            <!--Входящий номер внешнего документа-->            <xs:element name="incomingDocumentNumber" type="xs:string" minOccurs="0"/>            <!--Сотрудник (поле "зачесть сотруднику" на форме накладной)-->            <xs:element name="employeePassToAccount" type="xs:string" minOccurs="0"/>            <!--Номер товарно-транспортной накладной-->            <xs:element name="transportInvoiceNumber" type="xs:string" minOccurs="0"/>            <!--            UUID связанной расходной накладной            (только чтение)            @since 5.4            -->            <xs:element name="linkedOutgoingInvoiceId" type="xs:string" minOccurs="0"/>                         <!--            Алгоритм распределения дополнительных расходов.            (только чтение)            @since 6.0            -->            <xs:element name="distributionAlgorithm" type="distributionAlgorithmType" minOccurs="0"/>        </xs:sequence>    </xs:complexType>     <!--Позиция документа-->    <xs:complexType name="incomingInvoiceItemDto">        <xs:sequence>            <!--            Является дополнительным расходом            (только чтение)            @since 6.0            -->            <xs:element name="isAdditionalExpense" type="xs:boolean" minOccurs="0" default="false"/>             <!--Количество товара в его основных единицах измерения-->            <xs:element name="amount" type="xs:decimal" minOccurs="0"/>            <!--Товар у поставщика (guid)-->            <xs:element name="supplierProduct" type="xs:string" minOccurs="0"/>            <!--Товар у поставщика (артикул). Можно задать вместо guid начиная с 5.0.-->            <xs:element name="supplierProductArticle" type="xs:string" minOccurs="0"/>            <!--Товар (guid). Хотя бы одно из полей должно быть заполнено: product или productArticle.-->            <xs:element name="product" type="xs:string" minOccurs="0"/>            <!--Товар (артикул). Можно задать вместо guid товара начиная с 5.0, guid имеет приоритет.-->            <xs:element name="productArticle" type="xs:string" minOccurs="0"/>            <!--Производитель/импортер. Должен содержаться в списке производителей/импортеров в карточке товара:            Товар - Дополнительная информация - Акогольная декларация - Производитель/Импортер-->            <xs:element name="producer" type="xs:string" minOccurs="0"/>            <!--Номер позиции в документе. Обязательное поле.-->            <xs:element name="num" type="xs:int" minOccurs="1"/>            <!--Фасовка (guid)-->            <xs:element name="containerId" type="xs:string" minOccurs="0"/>            <!--Базовая единица измерения (guid)-->            <xs:element name="amountUnit" type="xs:string" minOccurs="0"/>            <!--Вес единицы измерения-->            <!--!!! Не реализовано !!!-->            <xs:element name="actualUnitWeight" type="xs:decimal" minOccurs="0"/>            <!--            Cумма строки без учета скидки.            Как правило sum == amount * price / container + discountSum + vatSum             -->            <xs:element name="sum" type="xs:decimal" minOccurs="1"/>            <!--Cумма скидки-->            <!--!!! Не реализовано !!!-->            <xs:element name="discountSum" type="xs:decimal" minOccurs="0"/>            <!--            Величина процента НДС и сумма НДС для строки документа.            Если не задана сумма, она вычисляется по проценту.            Если не задан процент, он берется из карточки товара.            Нельзя задать только сумму, не задавая процент.            @since 5.0            -->            <xs:element name="vatPercent" type="xs:decimal" minOccurs="0"/>            <xs:element name="vatSum" type="xs:decimal" minOccurs="0"/>            <!--Цена единицы измерения-->            <xs:element name="priceUnit" type="xs:string" minOccurs="0"/>            <!--Цена за ед.-->            <xs:element name="price" type="xs:decimal" minOccurs="0"/>            <!--            Цена без НДС за фасовку с учетом скидки            @since 6.2            -->            <xs:element name="priceWithoutVat" type="xs:decimal" minOccurs="0"/>            <!--Код-->            <!--!!! Не реализовано !!!-->            <xs:element name="code" type="xs:string" minOccurs="0"/>            <!--Склад-->            <xs:element name="store" type="xs:string" minOccurs="0"/>            <!--Номер государственной таможенной декларации-->            <xs:element name="customsDeclarationNumber" type="xs:string" minOccurs="0"/>            <!--Фактическое (подтвержденное) количество основных единиц товара-->            <xs:element name="actualAmount" type="xs:decimal" minOccurs="0"/>        </xs:sequence>    </xs:complexType>     <xs:simpleType name="documentStatus">        <xs:restriction base="xs:string">            <xs:enumeration value="NEW"/>            <xs:enumeration value="PROCESSED"/>            <xs:enumeration value="DELETED"/>        </xs:restriction>      </xs:simpleType>         <xs:simpleType name="distributionAlgorithmType">        <xs:restriction base="xs:string">            <xs:enumeration value="DISTRIBUTION_BY_SUM"/>            <xs:enumeration value="DISTRIBUTION_BY_AMOUNT"/>            <xs:enumeration value="DISTRIBUTION_NOT_SPECIFIED"/>        </xs:restriction>    </xs:simpleType></xs:schema>

XSD Расходная накладная 
XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xs:schema version="1.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">    <xs:element name="document" type="outgoingInvoiceDto"/>     <xs:complexType name="outgoingInvoiceDto">        <xs:sequence>            <!--            Id документа(только чтение)            @since 5.4            -->            <xs:element name="id" type="xs:string" minOccurs="0"/>            <xs:element name="documentNumber" type="xs:string" minOccurs="0"/>            <!--            Учетная дата-время документа.            Если не заполнено, используется дата-время сервера.            Поддерживаемые форматы:            yyyy-MM-ddTHH:mm:ss, yyyy-MM-dd (dd.MM.yyyy не рекомендуется).            -->            <xs:element name="dateIncoming" type="xs:dateTime" minOccurs="0"/>            <!--            false (по умолчанию): использовать переданные дату-время dateIncoming как есть.            true: использовать настройки проведения документов, заданные в подразделении:             * В режиме "текущее время" - дату и время из dateIncoming;             * "фиксированное время" или "время закрытия кассовой смены" - дату из dateIncoming, а время из настроек.            -->            <xs:element name="useDefaultDocumentTime" type="xs:boolean" minOccurs="0" default="false"/>            <xs:element name="status" type="documentStatus" minOccurs="0"/>            <!-- Счет для списания товаров (расходный счет). По умолчанию "5.01" ("Расход продуктов"). -->            <xs:element name="accountToCode" type="xs:string" minOccurs="0"/>            <!-- Счет выручки. По умолчанию "4.01" ("Торговая выручка"). -->            <xs:element name="revenueAccountCode" type="xs:string" minOccurs="0"/>            <!--            Склад (id или код). При создании накладных с проведением обязателен.            Заполняется либо в документе, либо в каждой строке отдельно, но не одновременно.            Если заполнен в документе, в бекофисе будет отмечена галочка "Отгрузить со склада".            -->            <xs:element name="defaultStoreId" type="xs:string" minOccurs="0"/>            <xs:element name="defaultStoreCode" type="xs:string" minOccurs="0"/>            <!-- Контрагент -->            <xs:element name="counteragentId" type="xs:string" minOccurs="0"/>            <xs:element name="counteragentCode" type="xs:string" minOccurs="0"/>            <!-- Концепция -->            <xs:element name="conceptionId" type="xs:string" minOccurs="0"/>            <xs:element name="conceptionCode" type="xs:string" minOccurs="0"/>            <!-- Комментарий -->            <xs:element name="comment" type="xs:string" minOccurs="0"/>            <!--            UUID связанной расходной накладной            (только чтение)            @since 5.4            -->            <xs:element name="linkedOutgoingInvoiceId" type="xs:string" minOccurs="0"/>            <xs:element name="items">                <xs:complexType>                    <xs:sequence>                        <xs:element name="item" type="outgoingInvoiceItemDto" minOccurs="0" maxOccurs="unbounded"/>                    </xs:sequence>                </xs:complexType>            </xs:element>        </xs:sequence>    </xs:complexType>     <xs:complexType name="outgoingInvoiceItemDto">        <xs:sequence>            <!-- Элемент номенклатуры (id или код (артикул))-->            <xs:element name="productId" type="xs:string" minOccurs="0"/>            <xs:element name="productArticle" type="xs:string" minOccurs="0"/>            <!--            Склад (id или код). При создании накладных с проведением обязателен.            Заполняется либо в документе, либо в каждой строке отдельно, но не одновременно.            -->            <xs:element name="storeId" type="xs:string" minOccurs="0"/>            <xs:element name="storeCode" type="xs:string" minOccurs="0"/>            <!-- Фасовка (id или код(артикул)) -->            <xs:element name="containerId" type="xs:string" minOccurs="0"/>            <xs:element name="containerCode" type="xs:string" minOccurs="0"/>            <!-- Цена за фасовку с учетом скидки -->            <xs:element name="price" type="xs:decimal" minOccurs="1"/>                   <!--            Цена без НДС за фасовку с учетом скидки            (только чтение)            @since 6.2            -->            <xs:element name="priceWithoutVat" type="xs:decimal" minOccurs="0"/>            <!-- Количество в базовых единицах измерения -->            <xs:element name="amount" type="xs:decimal" minOccurs="1"/>            <!--            Cумма строки без учета скидки.            Как правило sum == amount * price / container + discountSum + vatSum             -->            <xs:element name="sum" type="xs:decimal" minOccurs="1"/>            <!-- Cумма скидки -->            <xs:element name="discountSum" type="xs:decimal" minOccurs="0"/>            <!--            Величина процента НДС и сумма НДС для строки документа.            Если не задана сумма, она вычисляется по проценту.            Если не задан процент, он берется из карточки товара.            Нельзя задать только сумму, не задавая процент.            @since 5.0             -->            <xs:element name="vatPercent" type="xs:decimal" minOccurs="0"/>            <xs:element name="vatSum" type="xs:decimal" minOccurs="0"/>        </xs:sequence>    </xs:complexType>     <xs:simpleType name="documentStatus">        <xs:restriction base="xs:string">            <xs:enumeration value="NEW"/>            <xs:enumeration value="PROCESSED"/>            <xs:enumeration value="DELETED"/>        </xs:restriction>    </xs:simpleType></xs:schema>


*XSD Результат валидации документа​
XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xs:schema version="1.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">    <xs:element name="documentValidationResult" type="documentValidationResult"/>     <!--    Результат валидации документа.    Некоторые документы возвращают более подробную информацию, смотрите:     * incomingInventoryValidationResult.xsd    -->    <xs:complexType name="documentValidationResult">        <xs:sequence>            <!-- Результат валидации. -->            <xs:element name="valid" type="xs:boolean"/>            <!-- Указывает на то, что ошибка не критичная и служит в качестве предупреждения. -->            <xs:element name="warning" type="xs:boolean"/>            <!-- Номер валидируемого документа. -->            <xs:element name="documentNumber" type="xs:string" minOccurs="0"/>            <!--            Новый номер для документа.            Отличен от null, если старый нарушает уникальность или не изменились влияющие на номер поля.            -->            <xs:element name="otherSuggestedNumber" type="xs:string" minOccurs="0"/>            <!--            Текст ошибки (или только заголовок, если задано additionalInfo).            Предназначен для показа пользователю, но в REST API не всегда локализован.            -->            <xs:element name="errorMessage" type="xs:string" minOccurs="0"/>            <!--            Для невалидного результата может быть указана дополнительная информация, содержащая детали ошибки.            Например, для случая списания в минус это поле содержит детальную информацию по каждой позиции документа,            приводящей к отрицательным остаткам.            -->            <xs:element name="additionalInfo" type="xs:string" minOccurs="0"/>        </xs:sequence>    </xs:complexType></xs:schema>


Выгрузка приходных накладных 
Версия iiko: 5.4

GET Request	
https://host:port/resto/api/documents/export/incomingInvoice

Параметры запроса
Название	Значение	Описание
from	YYYY-MM-DD	начальная дата (входит в интервал)
to	YYYY-MM-DD	конечная  дата (входит в интервал, время не учитывается)
supplierId	GUID	Id поставщика
revisionFrom
число, по умолчанию -1
с версии 6.4

Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1

При запросе без поставщиков возвращает все приходные накладные, попавшие в интервал.

Что в ответе
[+] XSD Приходная накладная
Пример запроса и результат
Запрос
https://localhost:9080/resto/api/documents/export/incomingInvoice?key=491eca76-beed-845e-878c-9b05c97be0e2&from=2012-07-01&to=2012-07-02&supplierId=22A2A9D7-9D9C-48AD-BF99-83BF8CDE1938&supplierId=C5C6F00D-E1E5-4E3C-A4B8-BB677F470572

Выгрузка расходных накладных
Версия iiko: 5.4

GET Request	
https://host:port/resto/api/documents/export/outgoingInvoice 

Параметры запроса
Название	Значение	Описание
from	YYYY-MM-DD	начальная дата (входит в интервал)
to	YYYY-MM-DD	конечная  дата (входит в интервал, время не учитывается)
supplierId	GUID	Id поставщика
При запросе без поставщиков возвращает все расходные накладные, попавшие в интервал.

Что в ответе
[+] XSD Расходная накладная
Пример запроса и результат
Запрос


https://localhost:9080/resto/api/documents/export/outgoingInvoice?key=86024f97-3c65-08af-2798-d7817bcdadce&from=2012-07-04&to=2012-07-05&supplierId=18761e00-aa16-4d0f-a064-d26cb3e7c646

[+] Результат


Выгрузка приходной накладной по ее номеру
Версия iiko: 5.4

GET Request	
https://host:port/resto/api/documents/export/incomingInvoice/byNumber

Параметры запроса
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

Что в ответе  

[+] XSD Приходная накладная
Пример запроса и результат  
Запрос 

https://localhost:9080/resto/api/documents/export/incomingInvoice/byNumber?key=49023c7b-86f4-351a-b237-554a674bf3a9&number=1711&from=2012-01-01&to=2012-12-30&currentYear=false



Загрузка возвратной накладной
Версия iiko: 4.4

POST Request	
https://host:port/resto/api/documents/import/returnedInvoice

Content-Type: application/xml

Тело запроса
Структура returnedInvoiceDto

[+] XSD Возвратная накладная
Что в ответе
Структура documentValidationResult


[+] XSD Результат валидации документа
Пример вызова и результата

Запрос


XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<document>
  <documentNumber>TAKT0003</documentNumber>
  <dateIncoming>2016-05-03T00:12:35</dateIncoming>
  <status>PROCESSED</status>
  <incomingInvoiceNumber>TAKT0001</incomingInvoiceNumber>
  <incomingInvoiceDate>2016-05-01</incomingInvoiceDate>
  <counteragentId>4F1AC4B8-21AC-4FE6-8BEB-464EA10C5FFB</counteragentId>
  <items>
    <item>
      <storeId>84A2C3D1-488B-42F4-96C1-4670F7D08583</storeId>
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

Версия iiko: 5.4

GET Request	
https://host:port/resto/api/documents/export/outgoingInvoice/byNumber

Параметры запроса
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

Что в ответе 

[+] XSD Расходная накладная
Пример запроса и результат 
Запрос

https://localhost:9080/resto/api/documents/export/outgoingInvoice/byNumber?key=49023c7b-86f4-351a-b237-554a674bf3a9&number=4&from=2012-01-01&to=2012-12-30&currentYear=false

Результат


XML
<outgoingInvoiceDtoes>
    <document>
        <id>cde9adc2-1c49-4d68-9d30-31a3768df53e</id>
        <documentNumber>4</documentNumber>
        <dateIncoming>2012-07-04T23:00:00+04:00</dateIncoming>
        <useDefaultDocumentTime>false</useDefaultDocumentTime>
        <status>PROCESSED</status>
        <accountToCode>7.3</accountToCode>
        <revenueAccountCode>4.01.1</revenueAccountCode>
        <defaultStoreId>a80f6110-aa36-43ea-8fb7-de9b6a3a2346</defaultStoreId>
        <defaultStoreCode>16</defaultStoreCode>
        <counteragentId>18761e00-aa16-4d0f-a064-d26cb3e7c646</counteragentId>
        <counteragentCode>703</counteragentCode>
        <comment/>
        <items>
            <item>
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


Загрузка акта приготовления
Версия iiko: 3.9

POST Request	
https://host:port/resto/api/documents/import/productionDocument

Content-Type: application/xml

Тело запроса
Структура productionDocumentDto

[+] XSD Акт приготовления
Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа
Пример вызова и результат
Запрос

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



Загрузка акта реализации
Версия iiko: 3.9

POST Request	
https://host:port/resto/api/documents/import/salesDocument

Content-Type: application/xml

Тело запроса
Структура salesDocumentDto

[+] XSD Акт реализации
Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа
Пример вызова и результата
Запрос

https://localhost:8080/resto/api/documents/import/salesDocument?key=d5e3186a-b5a9-edf7-5164-ca55e29fe5e1


XML
<document>
  <items>
    <!--Zero or more repetitions:-->
      <item>
              <discountSum>11.00</discountSum>
              <sum>110.00</sum>
              <amount>3.00</amount>
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


Загрузка инвентаризации
Версия iiko: 5.1

POST Request	
https://host:port/resto/api/documents/import/incomingInventory

Content-Type: application/xml

Тело запроса
Структура incomingInventoryDto

[+] XSD Инвентаризация
Что в ответе
Структура incomingInventoryValidationResult

[+] XSD Результат валидации документа инвентаризации
Пример запроса и результат
Запрос


XML
<?xml version="1.0" encoding="UTF-8"?>
<document>
  <documentNumber>Imv20160703j</documentNumber>
  <dateIncoming>2016-07-03T00:24:00</dateIncoming>
  <status>PROCESSED</status>
  <storeId>1239d270-1bbe-f64f-b7ea-5f00518ef508</storeId>
  <comment>Ничего не изменилось</comment>
  <items>
    <item>
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
<incomingInventoryValidationResult>
    <valid>true</valid>
    <warning>false</warning>
    <documentNumber>Imv20160703k</documentNumber>
    <store>
        <id>1239d270-1bbe-f64f-b7ea-5f00518ef508</id>
        <code>1</code>
        <name>Main storage</name>
    </store>
    <date>2016-07-03T00:26:00+03:00</date>
    <items>
        <item>
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
</incomingInventoryValidationResult>


Получение результатов инвентаризации до её проведения

Версия iiko: 5.1

POST Request	
https://host:port/resto/api/documents/check/incomingInventory

Content-Type: application/xml

Тело запроса
Структура incomingInventoryDto

[+] XSD Инвентаризации
Что в ответе
Структура incomingInventoryValidationResult

[+] XSD Результат валидации документа инвентаризации

Пример запроса и результат
Запрос


XML
<?xml version="1.0" encoding="UTF-8"?>
<document>
  <documentNumber>Imv20160703j</documentNumber>
  <dateIncoming>2016-07-03T00:24:00</dateIncoming>
  <status>PROCESSED</status>
  <storeId>1239d270-1bbe-f64f-b7ea-5f00518ef508</storeId>
  <comment>Ничего не изменилось</comment>
  <items>
    <item>
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
<incomingInventoryValidationResult>
    <valid>true</valid>
    <warning>false</warning>
    <documentNumber>Imv20160703k</documentNumber>
    <store>
        <id>1239d270-1bbe-f64f-b7ea-5f00518ef508</id>
        <code>1</code>
        <name>Main storage</name>
    </store>
    <date>2016-07-03T00:26:00+03:00</date>
    <items>
        <item>
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
</incomingInventoryValidationResult>


Акты списания
Акты списания
Версия iiko: 7.9.3

Описание полей 
[+] WriteoffDocumentDto
[+] WriteoffDocumentItemDto
Выгрузка документов
GET Request	https://host:port/resto/api/v2/documents/writeoff
Параметры запроса
dateFrom	String	Начало временного интервала в формате "yyyy-MM-dd". Обязательный.
dateTo	String	Конец временного интервала в формате "yyyy-MM-dd". Обязательный.
status	Enum	Статус документа. Если не задан, то все.
revisionFrom	Integer	В ответе будут сущности с ревизией выше данной. По умолчанию '-1'.
Что в ответе
Список документов.

Поле revision - максимальная ревизия, доступная для выгрузки во внешние системы на момент запроса (это значит, что в базе присутствуют записи с такой ревизией, а записей с ревизией выше этой в базе нет).

Эту ревизию можно использовать в качестве параметра revisionFrom в следующем запросе на получение списка расписаний.

Пример запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/writeoff?dateFrom=2018-01-01&dateTo=2021-12-31

[+] Результат
Выгрузка документа по идентификатору
GET Request	https://host:port/resto/api/v2/documents/writeoff/byId
Параметры запроса
id	UUID	Идентификатор документа.
Что в ответе
Выгруженный документ

Пример запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/writeoff/byId?id=3d27d640-d6a1-4545-86a4-b07422c3c9f0

Результат
JSON
{
  "id": "3d27d640-d6a1-4545-86a4-b07422c3c9f0",
  "dateIncoming": "2020-01-10T23:00",
  "documentNumber": "20002",
  "status": "PROCESSED",
  "storeId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
  "accountId": "97036ddb-b2e1-cd47-1669-c145daa9f9c5",
  "items": [
    {
      "num": 1,
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
GET Request	https://host:port/resto/api/v2/documents/writeoff/byNumber
Параметры запроса
documentNumber	String	Номер документа.
Примеры запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/writeoff/byNumber?documentNumber=20002
Результат

JSON
[
  {
    "id": "3d27d640-d6a1-4545-86a4-b07422c3c9f0",
    "dateIncoming": "2020-01-10T23:00",
    "documentNumber": "20002",
    "status": "PROCESSED",
    "storeId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
    "accountId": "97036ddb-b2e1-cd47-1669-c145daa9f9c5",
    "items": [
      {
        "num": 1,
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
POST Request	https://host:port/resto/api/v2/documents/writeoff
Тело запроса
Если задан идентификатор документа - считаем, что это редактирование (редактировать приказ можно, если его статус 'NEW'), если не задан, то создание.

Обязательные поля: 'dateIncoming', 'status', 'storeId', 'accountId'. Также должна быть как минимум одна позиция в документе.

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
Пример запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/writeoff

Результат
JSON
{
  "result": "SUCCESS",
  "errors": [
  ],
  "response": {
    "id": "78e58a66-1648-e023-017d-28c01da501cc",
    "dateIncoming": "2021-11-16T23:00",
    "documentNumber": "",
    "status": "NEW",
    "comment": "yyy",
    "storeId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
    "accountId": "8c46f55a-0698-4e3f-8703-8bb36b24e8ac",
    "items": [
      {
        "num": 1,
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


Внутренние перемещения

Внутренние перемещения
Версия iiko: 7.9.3

Описание полей
[+] InternalTransferDto
[+] InternalTransferItemDto

Выгрузка документов
GET Request	https://host:port/resto/api/v2/documents/internalTransfer
Параметры запроса
dateFrom	String	Начало временного интервала в формате "yyyy-MM-dd". Обязательный.
dateTo	String	Конец временного интервала в формате "yyyy-MM-dd". Обязательный.
status	Enum	Статус документа. Если не задан, то все.
revisionFrom	Integer	В ответе будут сущности с ревизией выше данной. По умолчанию '-1'.
Что в ответе
Список документов.

Поле revision - максимальная ревизия, доступная для выгрузки во внешние системы на момент запроса (это значит, что в базе присутствуют записи с такой ревизией, а записей с ревизией выше этой в базе нет).

Эту ревизию можно использовать в качестве параметра revisionFrom в следующем запросе на получение списка расписаний.

Пример запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/internalTransfer?dateFrom=2018-01-01&dateTo=2021-12-31

[+] Результат
Выгрузка документа по идентификатору
GET Request	https://host:port/resto/api/v2/documents/internalTransfer/byId
Параметры запроса
id	UUID	Идентификатор документа.
Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/documents/internalTransfer/byId?id=f26f9661-c1c1-437e-b68a-e67cd78cc1a0
Результат
JSON
{
  "id": "f26f9661-c1c1-437e-b68a-e67cd78cc1a0",
  "dateIncoming": "2021-04-01T12:08:36.340",
  "documentNumber": "20002",
  "status": "NEW",
  "storeFromId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
  "storeToId": "cfdfaff0-382c-4851-bba2-92b408db02ef",
  "items": [
    {
      "num": 1,
      "productId": "ccdada6c-1643-4c52-9e09-752a4de117a0",
      "amount": 20,
      "measureUnitId": "cd19b5ea-1b32-a6e5-1df7-5d2784a0549a",
      "containerId": "e2e67737-18bf-437b-8230-8ec17da75096",
      "cost": null                                                
      
    }
    
  ]
  
}
 

Выгрузка документов по номеру
GET Request	https://host:port/resto/api/v2/documents/internalTransfer/byNumber
Параметры запроса
documentNumber	String	Номер документа.
Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/documents/internalTransfer/byNumber?documentNumber=20002
Результат

JSON
[
  {
    "id": "f26f9661-c1c1-437e-b68a-e67cd78cc1a0",
    "dateIncoming": "2021-04-01T12:08:36.340",
    "documentNumber": "20002",
    "status": "NEW",
    "storeFromId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
    "storeToId": "cfdfaff0-382c-4851-bba2-92b408db02ef",
    "items": [
      {
        "num": 1,
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
POST Request	https://host:port/resto/api/v2/documents/internalTransfer
Тело запроса
Если задан идентификатор документа - считаем, что это редактирование (редактировать приказ можно, если его статус 'NEW'), если не задан, то создание.

Обязательные поля: 'dateIncoming', 'status', 'storeFromId', 'storeToId'. Также должна быть как минимум одна позиция в документе.

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

Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/documents/internalTransfer

Результат
JSON
{
  "result": "SUCCESS",
  "errors": [
  ],
  "response": {
    "id": "0fd6f4ad-4858-401c-017d-22eacb7101a7",
    "dateIncoming": "2021-11-15T06:00",
    "documentNumber": "30002",
    "status": "NEW",
    "comment": "zzz",
    "storeFromId": "05a407d4-d7c6-4bc2-a578-6ad5de99d468",
    "storeToId": "370620fe-c789-46db-9d92-33bec29b82a3",
    "items": [
      {
        "num": 1,
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


Работа со сменами
Список смен
GET Request	https://host:port/resto/api/v2/cashshifts/list
Параметры запроса
Название
Значение
Описание
openDateFrom	YYYY-MM-DD	Период открытия смены ''с'' (входит в интервал).
openDateTo	YYYY-MM-DD	Период открытия смены ''по'' (входит в интервал).
departmentId	UUID	Список ТП, если пуст, то фильтра нет.
groupId	UUID	Список групп секций, если пуст, то фильтра нет.
status	
String

Значение
Описание
ANY	Любая.
OPEN	Открытая.
CLOSED	Закрытая.
ACCEPTED	Принята.
UNACCEPTED	Не принята.
HASWARNINGS	Подозрительная.
Фильтр по статусу. Не может быть пустым.
revisionFrom
число, -1
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1 (с версии iiko 6.4)

Что в ответе
Json структура. Возвращает списки смен

Поле
Значение
id	Id смены
sessionNumber	Номер кассовый смены (в нумерации фронта).
fiscalNumber	Фискальный номер смены (с ФРа).
cashRegNumber	Номер ФРа (в нумерации iiko).
cashRegSerial	Серийный номер ФРа.
openDate	Дата открытия смены.
closeDate	Дата закрытия смены.
acceptDate	
Дата принятия смены. null --- смена не принята.

managerId	Ответственный менеджер.
responsibleUser	Ответственный кассир.
sessionStartCash	Остаток в кассе на начало дня.
payOrders	Сумма всех заказов с учётом скидки
sumWriteoffOrders	Сумма заказов, закрытых за счет заведения.
salesCash	
Сумма продаж за наличные.  

salesCerdit	Сумма продаж в кредит.
salesCard	Сумма продаж по картам.
payIn	Сумма всех внесений.
payOut	Сумма всех изъятий, без учета изъятий в конце смены.
payIncome	Сумма изъятия в конце смены.
cashRemain	Остаток в кассе после закрытия смены.
cashDiff	Общее расхождение сумм книжных и фактических.
sessionStaus	Статус смены.
conception	Концепция, которой принадлежит данная кассовая смена.
pointOfSale	Точка продаж данной кассовой смены.
 Пример запроса и результат
JSON
[ 
   { 
      "id":"1c81b65a-1b8a-428f-8a74-2c994a928a86",
      "sessionNumber":583,
      "fiscalNumber":1003,
      "cashRegNumber":1,
      "cashRegSerial":"115744 ",
      "openDate":"2017-02-21T09:56:32.937",
      "closeDate":"2017-02-21T22:28:18.63",
      "acceptDate":null,
      "managerId":"173f155b-48e5-4da0-a9e7-3caa58cfa9d0",
      "responsibleUser":"173f155b-48e5-4da0-a9e7-3caa58cfa9d0",
      "sessionStartCash":0,
      "payOrders":21351,
      "sumWriteoffOrders":0,
      "salesCash":9787,
      "salesCredit":0,
      "salesCard":11564,
      "payIn":2000,
      "payOut":0,
      "payIncome":-11787,
      "cashRemain":0,
      "cashDiff":-11787,
      "sessionStatus":"UNACCEPTED",
      "conception":"bd6daa35-12ce-4117-af8f-816d99720eeb",
      "pointOfSale":"1b17ee6b-c499-4916-9347-fe854d3067b4"
   },
   { 
      "id":"43aab17c-ab23-4d5a-91f0-9fa39fac8612",
      "sessionNumber":145,
      "fiscalNumber":306,
      "cashRegNumber":3,
      "cashRegSerial":"115731 ",
      "openDate":"2017-02-21T10:00:51.733",
      "closeDate":"2017-02-21T23:16:59.13",
      "acceptDate":null,
      "managerId":"173f155b-48e5-4da0-a9e7-3caa58cfa9d0",
      "responsibleUser":"173f155b-48e5-4da0-a9e7-3caa58cfa9d0",
      "sessionStartCash":0,
      "payOrders":34885,
      "sumWriteoffOrders":0,
      "salesCash":0,
      "salesCredit":0,
      "salesCard":34885,
      "payIn":0,
      "payOut":0,
      "payIncome":0,
      "cashRemain":0,
      "cashDiff":0,
      "sessionStatus":"UNACCEPTED",
      "conception":"bd6daa35-12ce-4117-af8f-816d99720eeb",
      "pointOfSale":"e49cda0d-f3b1-4a8a-901e-7c44ee09c5a2"
   },
   { 
      "id":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
      "sessionNumber":1,
      "fiscalNumber":null,
      "cashRegNumber":998,
      "cashRegSerial":null,
      "openDate":"2017-05-03T14:07:44.11",
      "closeDate":"2017-05-03T14:08:57.307",
      "acceptDate":"2017-05-24T11:55:13.907",
      "managerId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "responsibleUser":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "sessionStartCash":0,
      "payOrders":2660,
      "sumWriteoffOrders":0,
      "salesCash":2660,
      "salesCredit":0,
      "salesCard":0,
      "payIn":0,
      "payOut":0,
      "payIncome":-2660,
      "cashRemain":0,
      "cashDiff":-2660,
      "sessionStatus":"HASWARNINGS",
      "conception":null,
      "pointOfSale":"4138237d-c4db-4bfb-b52e-18e1bb4f12e5"
   }
]


Выгрузка платежей, внесений, изъятий за смену
Версия iiko: 5.4

GET Request	
https://host:port/resto/api/v2/cashshifts/payments/list/{sessionId}

Параметры запроса
Название	Значение	Описание
hideAccepted	true, false	скрыть принятые
Что в ответе
Json структура. Возвращает списки внесений, изъятий, безналичных платежей за смену

Поле
Описание
sessionId	UUID запрошенной смены
cashlessRecords	
Список записей, относящихся к безналичным платежам.

payInRecords	Список записей, относящихся к внесениям. 
payOutRecords	Список записей, относящихся к  изъятиям. 
Запись в документе

Поле
Описание
info	Описание проводки
 

Поле
Описание
id	UUID проводки.
date	
Дата создания в формате "yyyy-MM-dd'T'HH:MM:SS"

Проводки оплат заказов содержат в этом поле учетный день, округленный до суток.

creationDate	
Дата создания в формате "yyyy-MM-dd'T'HH:MM:SS"

с привязкой ко времени, может быть меньше, чем date,
если используется настройка "конец учетного дня" <> 00:00.
group	
группа проводок:

CARD (безнал)
CREDIT (кредит)
PAYOUT (изъятия)
PAYIN (внесения)
accountId	Редактируемый счет. Чаще принимается конечный счет проводки.
counteragentId	Контрагент.
paymentTypeId	Тип оплаты.
type	Тип проводки.
sum	Сумма.
comment	Комментарий.
auth	
Авторизационные данные транзакции

Поле
Описание
user	UUID пользователя.
card	Номер карты.
causeEvenId	UUID события оплаты заказа.
cashierId	UUID кассира, совершившего проводку.
departmentId	UUID торгового предприятия.
cashFlowCategory	
Статья движения денежных средств (ДДС).

Поле
Описание
code	Код.
parentCategory	
Родительская статья ДДС.

type	
 

Тип деятельности:

OPERATIONAL (операционная)
INVESTMENT (инвестиционная)
FINANCE (финансовая)
 

actualSum	
Сумма из элемента документа закрытия кассовой смены соответствующего данным проводки

или сумма из проводки, если такового не нашлось.

originalSum	Сумма проводки.
editedPayAccountId 	
Счет из элемента документа закрытия кассовой смены соответствующего данным проводки

или сумма из проводки, если такового не нашлось. Редактируемый счет.

originalPayAccountId	Счет, значение которого совпадает с editedPayAccountId.
payAgentId	
Контрагент из элемента документа закрытия смены соответствующего данным проводки или

из транзакции, если такого элемента не нашлось.

paymentTypeId	Тип оплаты.
editableComment	Комментарий.
Пример запроса и результата

Запрос

https://localhost:8080/resto/api/v2/cashshifts/payments/list/f67fea0a-90d4-427c-ac3d-b82c1582f7f9?hideAccepted=false

[+] Результат

Выгрузка кассовой смены по id
Версия iiko: 5.4

GET Request	https://host:port/resto/api/v2/cashshifts/byId/{sessionId}
Что в ответе
Json структура кассовой смены.

Поле
Значение
id	Id смены
sessionNumber	Номер кассовый смены (в нумерации фронта).
fiscalNumber	Фискальный номер смены (с ФРа).
cashRegNumber	Номер ФРа (в нумерации iiko).
cashRegSerial	Серийный номер ФРа.
openDate	Дата открытия смены.
closeDate	Дата закрытия смены.
acceptDate	
Дата принятия смены. null --- смена не принята.

managerId	Ответственный менеджер.
responsibleUser	Ответственный кассир.
sessionStartCash	Остаток в кассе на начало дня.
payOrders	Сумма всех заказов с учётом скидки
sumWriteoffOrders	Сумма заказов, закрытых за счет заведения.
salesCash	
Сумма продаж за наличные.  

salesCerdit	Сумма продаж в кредит.
salesCard	Сумма продаж по картам.
payIn	Сумма всех внесений.
payOut	Сумма всех изъятий, без учета изъятий в конце смены.
payIncome	Сумма изъятия в конце смены.
cashRemain	Остаток в кассе после закрытия смены.
cashDiff	Общее расхождение сумм книжных и фактических.
sessionStaus	Статус смены.
conception	Концепция, которой принадлежит данная кассовая смена.
pointOfSale	Точка продаж данной кассовой смены.
Пример запроса и результат
Запрос

https://localhost:8080/resto/api/v2/cashshifts/byId/1c81b65a-1b8a-428f-8a74-2c994a928a86



  
[+] Результат

  
  
Выгрузка документы принятия кассовой смены по id смены
Версия iiko: 5.4 

GET Request	
https://host:port/resto/api/v2/cashshifts/closedSessionDocument/{id}

Что в ответе
Json структура документа принятия кассовой смены. Возвращает существующий документ, либо создает новый.

Поле
Значение
id	id документа.
session	
Кассовая смена

Поле
Значение
sessionId	id смены.
groupId	id группы секций работающих в одной кассовой смене.
number	Номер смены.
accountShortageId	Счет, на который записывается недостача.
counteragentShortageId	Контрагент, на которого записывается недостача.
accountSurplusId	Счет, на который записывается излишек.
counteragentSurplusId	Контрагент, на которого записывается излишек.
departmentId	Торговое предприятие кассовой смены.
items	
Элементы/строки документа

Поле
Значение
num	Номер элемента.
transactionId	UUID проводки.
sumReal	Отредактированная сумма.
accountOverrideId	Отредактированный счет.
counteragentOverrideId	Отредактированный контрагент.
status	
Статус.

Значение
Описание
ACCEPTED	принята
UNACCEPTED	не принята
HASWARNINGS	подозрительная
comment	Комментарий.
Пример запроса и результата
https://localhost:8080/resto/api/v2/cashshifts/closedSessionDocument/f67fea0a-90d4-427c-ac3d-b82c1582f7f9

JSON
{ 
   "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
   "session":{ 
      "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
      "groupId":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
      "number":1
   },
   "accountShortageId":null,
   "counteragentShortageId":null,
   "accountSurplusId":null,
   "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
   "items":[ 
      { 
         "num":0,
         "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
         "sumReal":2660,
         "accountOverrideId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
         "counteragentOverrideId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
         "status":"ACCEPTED",
         "comment":"test"
      }
   ]
}

Принятие кассовой смены
Примерный алгоритм принятия кассовой смены
Получить список кассовых смен. Выбрать id смены, которую нужно принять.
Получить документ принятия кассовой смены по id смены.
Получить список безналичных платежей, внесений, изъятий по выбранной из п.1 кассовой смене.
Дополнить список элементов документа недостающими.
Список из п.3 содержит все проводки смены. Документ принятия смены из п.2 состоит из элементов, редактирующих
такие проводок. Если есть проводки, для которых нет элементов в документе (например, когда смена закрывается впервые),
то нужно добавить новые элементы. Другими словами документ принятия смены должен содержать все проводки из п.3.

Добавление нового элемента происходит на основании записи из списка, полученного в п.3., следующим образом:

В поле num устанавливается следующий порядковый номер.
В поле transactionId устанавливается UUID добавляемой проводки.
В поле sumReal указывается результат редактирования суммы проводки: поле sum. sumReal заполняется только для
изъятий. т.е. для записей из payOutRecords. Для других записей сумма не редактируется.
В поле accountOverride устанавливаете результат редактирования счета из поля accountId. В counteragentOverride
результат редактирования counteragentId с некоторыми правилами.
Указывается нужный статус и комментарий.
       5. Отредактировать документ.

       6. Отправить на сервер.



Версия iiko: 5.4

POST Request	
https://host:port/resto/api/v2/cashshifts/save

Content-Type: application/json
Тело запроса
Поле
Значение
id	id документа.
session	
Кассовая смена

Поле
Значение
sessionId	id смены.
group	id группы секций работающих в одной кассовой смене.
number	Номер смены.
accountShortageId	Счет, на который записывается недостача.
counteragentShortageId	Контрагент, на которого записывается недостача.
accountSurplusId	Счет, на который записывается излишек.
counteragentSurplusId	Контрагент, на которого записывается излишек.[1]
departmentId	Торговое предприятие кассовой смены.
items	
Элементы/строки документа.

Элемент - продажа за безнал, внесение, изъятие.

Поле
Значение
num	Номер элемента.
transactionId	UUID проводки кассовой смены.
sumReal	Отредактированная сумма.
accountOverrideId	Отредактированный счет.
counteragentOverrideId	
Отредактированный контрагент.[2]

status	
Статус.

Значение
Описание
ACCEPTED	принята
UNACCEPTED	непринята
HASWARNINGS	подозрительная
comment	Комментарий.
[1].Счета/контрагенты  для недостачи/излишка должны быть заполнены независимо от выбранного счета.

Так сделано для обратной совместимости.

[2]. Контрагент в элементе документа должен быть указан только для счетов :

Тип счета
Название
ACCOUNTS_RECEIVABLE
Задолженность покупателей
DEBTS_OF_EMPLOYEES
Задолженность сотрудников
EMPLOYEES_LIABILITY
Расчеты с сотрудниками
ACCOUNTS_PAYABLE
Расчеты с поставщиками
CLIENTS_LIABILITY
Расчеты с гостями
Список доступных счетов можно получить через API счетов.

JSON
{ 
   "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
   "session":{ 
      "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
      "groupId":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
      "number":1
   },
   "accountShortageId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
   "counteragentShortageId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "accountSurplusId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
   "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
   "items":[ 
      { 
         "num":0,
         "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
         "sumReal":2650,
         "accountOverrideId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
         "counteragentOverrideId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
         "status":"ACCEPTED",
         "comment":"test"
      }
   ]
}

Что в ответе
Содержит результат импорта, который состоит из результата валидации импортируемого документа и самого документа. Результат валидации состоит из ошибок, общих для всего документа, и ошибок по каждому отдельному элементу  документа. Ошибка состоит из кода ошибки и текста ошибки.


Поле
Значение
importResult	
Статус результата принятия смены

SUCCESS, ERROR

status	
Статус принятой смены. Вычисляется из совокупности статусов элементов документа.

Статус элемента задает пользователь. Если хотя бы один элемент имеет статус HASWARNINGS,

то весь документ будет в статусе HASWARNINGS, если хотя бы один элемент в статусе UNACCEPTED,

то весь документ будет в таком же статусе, ACCEPTED - все элементы приняты.

У HASWARNINGS самый высокий приоритет.

Значение
Описание
UNACCEPTED	не принята
ACCEPTED	принята
HASWARNINGS	подозрительна
errors	
Список ошибок, не позволивших сделать успешный импорт документа.

Поле
Значение
documentError	Ошибки в полях документа.
itemError	
Ошибки в полях документа.

Поле
Значение
identifier	UUID элемента.
error	Ошибка.
document	Импортируемый документ.
Ошибка
Поле
Значение
value	Неверное значение, либо название пустого поля.
code	Код ошибки.
[+] Коды ошибок
Пример запроса и результат
Запрос


https://localhost:8080/resto/api/v2/cashshifts/save 
Результат
JSON
{ 
   "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
   "session":{ 
      "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
      "groupId":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
      "number":1
   },
   "accountShortageId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
   "counteragentShortageId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "accountSurplusId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
   "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
   "items":[ 
      { 
         "num":0,
         "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
         "sumReal":2650,
         "accountOverrideId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
         "counteragentOverrideId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
         "status":"ACCEPTED",
         "comment":"test"
      }
   ]
}

​

Пример успешного импорта - SUCCESS

JSON
{ 
   "importResult":"SUCCESS",
   "status":"ACCEPTED",
   "errors":null,
   "document":{ 
      "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
      "session":{ 
         "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
         "groupId":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
         "number":1
      },
      "accountShortageId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
      "counteragentShortageId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "accountSurplusId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
      "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
      "items":[ 
         { 
            "num":0,
            "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
            "sumReal":2650,
            "accountOverrideId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
            "counteragentOverrideId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
            "status":"ACCEPTED",
            "comment":"test"
         }
      ]
   }
}


Пример не успешного импорта - ERROR

JSON
{ 
   "importResult":"ERROR",
   "status":null,
   "errors":{ 
      "documentError":[ 
         { 
            "value":"ad3cc1aa-a60c-c85c-e66d-3904490de4b9",
            "code":"ACCOUNT_SHORTAGE_NOT_FOUND"
         },
         { 
            "value":"counteragentShortage",
            "code":"EMPTY_FIELD"
         }
      ],
      "itemError":[ 
         { 
            "identifier":0,
            "error":[ 
               { 
                  "value":"bd3cc1aa-a60e-c85c-e66d-3904490de4b9",
                  "code":"INVENTORY_ASSETS_TYPE_NOT_ALLOWED"
               },
               { 
                  "value":"6c6f7e76-2fee-473e-879e-4c4c2faaa032",
                  "code":"COUNTERAGENT_DELETED"
               }
            ]
         }
      ]
   },
   "document":{ 
      "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
      "session":{ 
         "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
         "group":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
         "number":1
      },
      "accountShortageId":"ad3cc1aa-a60c-c85c-e66d-3904490de4b9",
      "counteragentShortageId":null,
      "accountSurplusId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
      "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
      "items":[ 
         { 
            "num":0,
            "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
            "sumReal":2650,
            "accountOverrideId":"bd3cc1aa-a60e-c85c-e66d-3904490de4b9",
            "counteragentOverrideId":"6c6f7e76-2fee-473e-879e-4c4c2faaa032",
            "status":"HASWARNINGS",
            "comment":"test"
         }
      ]
   }
}


Работа с изъятиями
Доступ
Чтобы пользоваться API:

Получения типов внесений и изъятий: право B_APIO "Просматривать типы внесений/изъятий".
Выполнения изъятий: право F_APIO "Авторизовывать кассовые внесения и изъятия".
Получение типов внесений и изъятий
GET Request	https://host:port/resto/api/v2/entities/payInOutTypes/list
Параметры запроса
Название	Тип данных
Версия	Описание
includeDeleted	Boolean	 	включая удаленные (по умолчанию false)
revisionFrom	-1, число	с 6.4	
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1

Что в ответе
Json структура. Возвращает список типов внесений и изъятий. 

Поле
Тип данных
Описание
id	UUID	Guid внесения/изъятия в базе iiko.
chiefAccount	UUID	Guid шеф-счёта. При изъятии перемещаются на корр. счёт, а при внесении наоборот.
account	UUID	Guid корр-счёта. При изъятии перемещаются на корр. счёт, а при внесении наоборот.
counteragentType	Enum	
Тип контрагента:

NONE (нет)
COUNTERAGENT (все)
EMPLOYEE (сотрудник)
SUPPLIER (поставщик)
CLIENT (гость)
INTERNAL_SUPPLIER (внутренний поставщик)


transactionType	Enum	Тип проводки.
cashFlowCategory	DTO	Статья движения денежных средств (ДДС).
conception	DTO	
Концепция

Параметр
Тип, формат
Описание
id	String	Guid концепции в базе iiko.
code	String	Код.
name	String	Название. 
limit
BigDecimal
 Предельная сумма для внесений/изъятий на iikoFront.
comment	String
Комментарий
mandatoryFrontComment
Boolean
 Требовать ввода комментария к операции в iikoFront.
isDeleted
Boolean
Удален
Пример запроса и результата
Запрос

https://localhost:8080/resto/api/v2/entities/payInOutTypes/list?includeDeleted=true


[+] Результат

Совершить изъятие
Версия iiko: 6.0

POST Request	https://host:port/resto/api/v2/payInOuts/addPayOut
Content-Type: application/json

Тело запроса
Поле
Тип данных
Описание
payOutTypeId	UUID	Guid типа изъятия в базе iiko.
payOutDate	String	Дата в формате yyyy-MM-dd. Время проставляется текущее.
counteragent	UUID	Guid контрагента в базе iiko. В зависимости от типа изъятия.
departmentSumMap
UUID -> BigDecimal
Торговое предприятие -> сумма изъятия.
payrollId
UUID
Guid платежной ведомости в базе iiko. Указывается если изъятие происходит на счет
(т.е. корр.счет) "Текущие расчеты с сотрудниками".
comment
String
Комментарий.
Что в ответе
Содержит результат изъятия, который состоит из результата валидации параметров изъятия и самого изъятия. Результат валидации состоит из ошибок. Ошибка состоит из кода ошибки и текста ошибки.

Поле
Тип данных
Значение
result	Enum
SUCCESS, ERROR
payOutSettings	DTO
Параметры изъятия.
errors	DTO
Список ошибок, не позволивших сделать изъятие. 
Пример вызова
https://localhost:8080/resto/api/v2/payInOuts/addPayOut

Пример результата - SUCCESS 

JSON
 { 
   "result":"SUCCESS",
   "errors":null,
   "payOutSettings":{ 
      "payOutTypeId":"37d410d1-c524-4a76-b28c-8b733e313d7a",
      "payOutDate":"2017-10-18",
      "counteragent":null,
      "departmentSumMap":{ 
         "06d7ec0c-8fee-f341-015f-b58127ff000d":1500
      },
      "payrollId":null,
      "comment":null
   }
}

Пример результата - ERROR 

JSON
{ 
   "result":"ERROR",
   "errors":[ 
      { 
         "value":"chiefAccount",
         "code":"ACCOUNT_NOT_SPECIFIED"
      }
   ],
   "payOutSettings":{ 
      "payOutTypeId":"32e01087-ded3-b5bb-4b82-6a3f0348af84",
      "payOutDate":"2017-10-18",
      "counteragent":null,
      "departmentSumMap":{ 
         "06d7ec0c-8fee-f341-015f-b58127ff000d":-100
      },
      "payrollId":null,
      "comment":null
   }
}


Получение платежных ведомостей
Версия iiko: 6.0

GET Request	https://host:port/resto/api/v2/payrolls/list
Параметры запроса
Поле
Тип данных
Описание
dateFrom	String
Начало периода в формате yyyy-MM-dd, включительно.
dateTo	String
Окончание периода в формате yyyy-MM-dd, включительно.
department	UUID
Guid  торгового предприятия. в базе iiko.
includeDeleted	Boolean
Включая удаленные (по умолчанию false). 
Что в ответе
Возвращает список платежных ведомостей.

Поле
Тип данных
Описание
payrollId	UUID
UUID ведомости.
dateFrom	Date
Дата начала действия.
dateTo	Date
Дата окончания действия.
department	UUID
Guid торгового предприятия.
documentNumber
String
Номер документа.
status
Enum
Статус документа (NEW, PROCESSED, DELETED).
comment
String
Комментарий.

Пример запроса и результата
Запрос

https://localhost:8080/resto/api/v2/payrolls/list?dateFrom=2017-08-01&dateTo=2017-10-01&department=372f68b4-8e7a-bae1-015f-0f9c638f000d
Результат

JSON
[
    {
        "id": "d4b29bd7-076f-48ba-9f93-6f21b78f47bf",
        "dateFrom": "2017-10-01T00:00:00",
        "dateTo": "2017-10-31T23:59:59",
        "department": "372f68b4-8e7a-bae1-015f-0f9c638f000d",
        "documentNumber": "0001",
        "status": "PROCESSED",
        "comment": null
   }
]


Warning	Для использования кириллицы в комментарии (параметр comment) при совершении изъятия в headers запроса должен быть параметр: content-type: application/json;charset=UTF-8
Примеры изъятий
Изъятие. Платёжная ведомость
Запрос

POST Request	https://localhost:8080/resto/api/v2/payInOuts/addPayOut
Код

{
"payOutTypeId":"114c757f-bac4-422c-a184-0935923b60b8",
"payOutDate":"2017-12-13",
"counteragent":"d244cb85-9115-4b4d-8e02-a4f7fdd8ec15",
"departmentSumMap":{
"2b9c2770-f146-43b8-9ac1-ad717d9c7996":90.0
},
"payrollId":"c1349656-8401-4476-9541-7f0325c65f98",
"comment":"Comment"
}

Результат

Код
{
"result": "SUCCESS",
"errors": null,
"payOutSettingsDto": {
"payOutTypeId": "114c757f-bac4-422c-a184-0935923b60b8",
"payOutDate": "2017-12-13",
"counteragent": "d244cb85-9115-4b4d-8e02-a4f7fdd8ec15",
"departmentSumMap": {"2b9c2770-f146-43b8-9ac1-ad717d9c7996": 90},
"payrollId": "c1349656-8401-4476-9541-7f0325c65f98",
"comment": "Comment "
}
}


Изъятие. Аванс поставщику
Запрос

POST Request	https://localhost:8080/resto/api/v2/payInOuts/addPayOut
Код

{
"payOutTypeId":"0cacd214-c280-4f58-afb3-28d25de90c21",
"payOutDate":"2017-12-13",
"counteragent":"ac716010-c95c-4705-a4bf-d202816c406e",
"departmentSumMap":{
"2b9c2770-f146-43b8-9ac1-ad717d9c7996":1000.0
},
"comment":"test1"
}

Результат

Код
{
"result": "SUCCESS",
"errors": null,
"payOutSettingsDto": {
"payOutTypeId": "0cacd214-c280-4f58-afb3-28d25de90c21",
"payOutDate": "2017-12-13",
"counteragent": "ac716010-c95c-4705-a4bf-d202816c406e",
"departmentSumMap": {"2b9c2770-f146-43b8-9ac1-ad717d9c7996": 1000},
"payrollId": null,
"comment": "test1"
}
}



Формирование OLAP отчета в API
Получить данные в API при помощи OLAP отчета можно следующими путями:

- получение данных по преднастроенному отчету в iikoOffice: в классическом приложении iikoOffice выбрать в навигационном меню раздела «Розничные продажи» - "OLAP Отчет по продажам", добавить в него поля и период для получения данных, сохранить данный вариант. Далее выгрузить список преднастроенных отчетов и получить информацию по полям и фильтрам при помощи метода «Получение отчета по сохраненной конфигурации».

- самостоятельное формирование отчета OLAP, руководствуясь документацией.


В обоих случаях рекомендуется использовать OLAP v2. 

Тот же механизм доступен для работы с "OLAP Отчет по проводкам" в разделе "Финансы".

Описание примеров OLAP-отчетов в iikoOffice можно найти в здесь. 

Описание примеров OLAP-отчетов в API можно найти здесь. 

Подробное описание полей можно прочитать в статье по полям OLAP-отчета по продажам и в статье по полям OLAP-отчета по проводкам. 

Процесс формирования отчета в iikoOffice
В классическом приложении iikoOffice выберите "OLAP Отчет по продажам" в навигационном меню раздела «Розничные продажи»:

Изображение выглядит как текст, снимок экрана, программное обеспечение, веб-страница  Содержимое, созданное искусственным интеллектом, может быть неверным.
После запуска «OLAP Отчет по продажам» укажите период сбора данных, добавьте поля для сбора данных.


Далее сохраните сформированный отчет, дайте ему название.



Готово. Отчет сохранен и готов к выгрузке через API.
Дополнительно: при нажатии на комбинацию клавиш «CTRL + SHIFT + F3» выведется окно с параметрами OLAP-отчета, на которые можно ориентироваться при построение отчета в API.



Работа с API iikoServer
Статья по авторизации для работы с методами API iikoServer.

Метод для получения списка преднастроенных отчетов OLAP.

Ответ метода для рассматриваемого примера:

JSON
....  
{
        "id": "e45124ec-6455-4a1f-ba59-9aa3efe05f30",
        "name": "Отчет по проданным блюдам в смену",
        "buildSummary": null,
        "reportType": "SALES",
        "groupByRowFields": [
            "OpenDate.Typed",
            "SessionNum",
            "OpenTime",
            "CloseTime",
            "DishName",
            "OrderType",
            "Delivery.CustomerName",
            "Delivery.CustomerPhone",
            "PayTypes"
        ],
        "groupByColFields": [],
        "aggregateFields": [
            "DishSumInt"
        ],
        "filters": {
            "DeletedWithWriteoff": {
                "filterType": "IncludeValues",
                "values": [
                    "NOT_DELETED"
                ]
            },
            "OrderDeleted": {
                "filterType": "IncludeValues",
                "values": [
                    "NOT_DELETED"
                ]
            }
        }
    }
...

Метод для получения тела отчета по сохраненной конфигурации (id)

[+] Ответ для рассматриваемого примера
Метод для получения полей OLAP отчета v2 (если необходимость уточнить поля).



Метод для формирования OLAP отчета в API (с возможностью конфигурации тела запроса)
POST Request	https://host:port.iiko.it/resto/api/v2/reports/olap?key=[token]
Параметры запроса

Параметр
Описание
key

Строка-токен, получаемый при авторизации
Тело запроса
Код
{
    "reportType": "SALES",
    "groupByRowFields": [
            "OpenDate.Typed",
            "SessionNum",
            "OpenTime",
            "CloseTime",
            "DishName",
            "OrderType",
            "Delivery.CustomerName",
            "Delivery.CustomerPhone",
            "PayTypes"
    ],
    "groupByColFields": [],
    "aggregateFields": [
        "DishSumInt"
    ],
    "filters": {
        "OpenDate.Typed": {
            "filterType": "DateRange",
            "periodType": "CUSTOM",
            "from": "2025-03-01T00:00:00.000",
            "to": "2025-03-31T00:00:00.000"
            
        },
        "DeletedWithWriteoff": {
            "filterType": "IncludeValues",
            "values": [
                "NOT_DELETED"
            ]
        },
        "OrderDeleted": {
            "filterType": "IncludeValues",
            "values": [
                "NOT_DELETED"
            ]
        }
    }
}
Что в ответе
JSON
{
    "data": [
        {
            "CloseTime": "2025-03-18T12:05:24.618",
            "Delivery.CustomerName": "Пупкин Василий",
            "Delivery.CustomerPhone": "+79785160513",
            "DishName": "Лимонад",
            "DishSumInt": 176,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T11:36:48",
            "OrderType": null,
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T15:34:01.955",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Шоколадный батончик",
            "DishSumInt": 50,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T15:33:41",
            "OrderType": null,
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T19:11:06.321",
            "Delivery.CustomerName": null,
            "Delivery.CustomerPhone": null,
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T19:10:47",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T19:14:02.906",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T19:13:20",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T19:19:12.99",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T19:18:35",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T19:21:43.061",
            "Delivery.CustomerName": null,
            "Delivery.CustomerPhone": null,
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T19:21:25",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T23:14:50.343",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T20:07:22",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T23:15:22.35",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T20:13:45",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-19T12:58:35.344",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-19T12:56:35",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-24T10:26:53.437",
            "Delivery.CustomerName": null,
            "Delivery.CustomerPhone": null,
            "DishName": "Шоколадный батончик MARS",
            "DishSumInt": 50,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-24T10:23:59",
            "OrderType": null,
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-25T12:44:08.425",
            "Delivery.CustomerName": null,
            "Delivery.CustomerPhone": null,
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-24",
            "OpenTime": "2025-03-24T13:21:53",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Наличные",
            "SessionNum": 18
        }
    ],
    "summary": []
}


Отчеты
Балансы по счетам, контрагентам и подразделениям
Версия iiko: 5.2

GET Request	https://host:port/resto/api/v2/reports/balance/counteragents
Параметры запроса
Параметр
Описание
timestamp
учетная-дата время отчета в формате yyyy-MM-dd'T'HH:mm:ss (обязательный)
account
id счета для фильтрации (необязательный, можно указать несколько)
counteragent
id контрагента для фильтрации (необязательный, можно указать несколько)
department
id подразделения для фильтрации (необязательный, можно указать несколько)
Что в ответе
Возвращает денежные балансы по указанным счетам, контрагентам и подразделениям на заданную учетную дату-время.

См. ниже пример результата.

Пример запроса и результата
Запрос

https://localhost:9080/resto/api/v2/reports/balance/counteragents?key=88e98be8-89c4-766b-a319-dc6d1f3b8cec&timestamp=2016-10-19T23:10:10

[+] Результат


Остатки на складах
Версия iiko: 5.2

GET Request	https://host:port/resto/api/v2/reports/balance/stores
Параметры запроса
Параметр
Описание
timestamp
учетная-дата время отчета в формате yyyy-MM-dd'T'HH:mm:ss (обязательный)
department
id подразделения для фильтрации (необязательный, можно указать несколько)
store	id склада для фильтрации (необязательный, можно указать несколько)
product
id элемента номенклатуры для фильтрации (необязательный, можно указать несколько)
Что в ответе
Возвращает количественные (amount) и денежные (sum) остатки товаров (product) на складах (store) на заданную учетную дату-время.

См. ниже пример результата.

Пример запроса и результата
Запрос 

https://localhost:9080/resto/api/v2/reports/balance/stores?key=88e98be8-89c4-766b-a319-dc6d1f3b8cec&timestamp=2016-10-18T23:10:10

Результат


Код
[
    {
        "store": "657ded9f-a1a3-416c-91a4-5a2fc78e8a36",
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


Отчет по балансу на 3 регистре ЕГАИС (акцизные марки)
Получение обновлений состояния на 3 регистре
Версия iiko: 7.4

GET Request	https://host:port/resto/api/v2/reports/egais/marks/list
Параметры запроса
Название
Тип данных
Обязательный
Описание
fsRarId	List<String>	
Нет, по умолчанию

возвращаются данные для всех организаций.

Список РАР-идентификаторов организаций, баланс которых запрашивается
revisionFrom 	int	Нет, по умолчанию -1	
Номер ревизии, начиная с которой необходимо отфильтровать сущности.

Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

Пример запроса и результат
Запрос

https://localhost:8080/resto/api/v2/reports/egais/marks/list?fsRarId=030000455388&fsRarId=030000455399&revisionFrom=100

[+] Пример результата
Описание полей

Поле
Тип данных
Описание
revision	int	Ревизия, по которую (включительно) выданы данные
fullUpdate	Boolean	
true - пакет является "полным обновлением", то есть, клиент должен удалить все имеющие данные, не перечисленные явно.

false - пакет является "частичным обновлением", клиент должен заменить закешированные записи с теми же ключами.

marksByBRegId	Map<String, EgaisBRegDto>	

Название вложенного поля - BRegId - Идентификатор Справки Б (Справки 2)

Значение вложенного поля:



Поле
Тип данных
Описание
dateTo	Дата в формате yyyy-MM-dd'T'HH:mm:ss.SSS	
Дата-время актуальности состояния:

MAX_DATE, если марка еще не списана
Дата-время списания + MAX_MARK_KEEP_DAYS дней, если списана документом, находящимся в нередактируемом статусе

Дата-время удаления последнего известного EgaisMarkTableItem (информация о движении акцизной марки) (для отсутствующих марок).
marksWrittenOff	Map<String, EgasMarkStateDto>	

Множество акцизных марок, списанных с баланса организации.

Название вложенного поля - полный текст акцизной марки.

Значения вложенного поля:


Параметр
Тип, формат
Описание
dateTo	Дата в формате yyyy-MM-dd'T'HH:mm:ss.SSS	
Дата-время актуальности состояния:

MAX_DATE, если марка еще не списана
Дата-время списания + MAX_MARK_KEEP_DAYS дней, если списана документом, находящимся в нередактируемом статусе

Дата-время удаления последнего известного EgaisMarkTableItem (информация о движении акцизной марки) (для отсутствующих марок).


OLAP-отчеты
Поля OLAP-отчета
Версия iiko: 4.1

GET Request	https://host:port/resto/api/v2/reports/olap/columns
Параметры запроса
Параметры	Описание
reportType	
Тип отчета:

SALES - По продажам
TRANSACTIONS - По транзакциям
DELIVERIES - По доставкам
Что в ответе
Json структура списка полей с информацией по возможностям фильтрации, агрегации и группировки.

Устаревшие поля (deprecated) не выводятся.

Структура списка полей 
JSON
"FieldName": {
  "name": "StringValue",
  "type": "StringValue",
  "aggregationAllowed": booleanValue,
  "groupingAllowed": booleanValue,
  "filteringAllowed": booleanValue,
  "tags": [
    "StringValue1",
    "StringValue2",
    ...,
    "StringValueN",
  ]
}

Название	Значение	Описание
FieldName 
Строка	Название колонки отчета. Именно это название используется для получения данных отчета
name 
Строка	Название колонки отчета в iikoOffice. Справочная информация.
type	Строка	
Тип поля. Возможны следующие значения:

ENUM - Перечислимые значения
STRING - Строка
ID - Внутренний идентификатор объекта в iiko (начиная с 5.0)
DATETIME - Дата и время
INTEGER - Целое
PERCENT - Процент (от 0 до 1)
DURATION_IN_SECONDS - Длительность в секундах
AMOUNT - Количество
MONEY - Денежная сумма
aggregationAllowed
true/false	Если true, то по данной колонке можно агрегировать данные
groupingAllowed
true/false	Если true, то по данной колонке можно группировать данные
filteringAllowed
true/false	Если true, то по данной колонке можно фильтровать данные
tags
Список строк	Список категорий отчета, к которому относится данное поле. Справочная информация. Соответствует списку в верхнем правом углу конструктора отчета в iikoOffice.
Пример запроса
https://localhost:8080/resto/api/v2/reports/olap/columns?key=5b119afe-9468-ab68-7d56-c71495e39ee4&reportType=SALES

Ответ 
JSON
{
  "PercentOfSummary.ByCol": {
    "name": "% по столбцу",
    "type": "PERCENT",
    "aggregationAllowed": true,
    "groupingAllowed": false,
    "filteringAllowed": false,
    "tags": [
      "Оплата"
    ]
  },
  "PercentOfSummary.ByRow": {
    "name": "% по строке",
    "type": "PERCENT",
    "aggregationAllowed": true,
    "groupingAllowed": false,
    "filteringAllowed": false,
    "tags": [
      "Оплата"
    ]
  },
  "Delivery.Email": {
    "name": "e-mail доставки",
    "type": "STRING",
    "aggregationAllowed": false,
    "groupingAllowed": true,
    "filteringAllowed": true,
    "tags": [
      "Доставка",
      "Клиент доставки"
    ]
  }
}

Общая информация (General info)
Версия iiko: 4.1

POST Request	https://host:port/resto/api/reports/olap
Content-type: Application/json; charset=utf-8

Тело запроса
JSON
{
  "reportType": "EnumValue",
  "buildSummary": "true",
  "groupByRowFields": [
    "groupByRowFieldName1",
    "groupByRowFieldName2",
    ...,
    "groupByRowFieldNameN"
  ],
  "groupByColFields": [
    "groupByColFieldName1",
    "groupByColFieldName2",
    ...,
    "groupByColFieldNameL"
  ],
  "aggregateFields": [
    "AggregateFieldName1",
    "AggregateFieldName2",
    ...,
    "AggregateFieldNameM"
  ],
  "filters": {
    filter1,
    filter2,
    ...
    filterK
  }
}

Название	Значение	Описание
reportType
SALES

TRANSACTIONS

DELIVERIES

Тип отчета:

SALES - По продажам
TRANSACTIONS - По проводками
DELIVERIES - По доставкам
buildSummary
true/false
Параметр появился в Version(iiko) 5.3.4. Считать ли итоговые значения. Необязательное, до версии 9.1.2 по умолчанию true, с версии 9.1.2 по умолчанию false.
groupByRowFields 
Список полей для группировки по строкам	Имена полей, по которым доступна группировка. Список полей можно получить через метод reports/olap/columns, как элементы данного списка используются поля FieldName из возвращаемой reports/olap/columns структуры. Для указания в данном списке доступны поля, у которых groupingAllowed = true
groupByColFields 
Список полей для группировки по столбцам	Необязательный. Имена полей, по которым доступна группировка. Список полей можно получить через метод reports/olap/columns, как элементы данного списка используются поля FieldName из возвращаемой reports/olap/columns структуры. Для указания в данном списке доступны поля, у которых groupingAllowed = true
aggregateFields 
Список полей для агрегации	Имена полей, по которым доступна агрегация. Список полей можно получить через метод reports/olap/columns, как элементы данного списка используются поля FieldName из возвращаемой reports/olap/columns структуры. Для указания в данном списке доступны поля, у которых filteringAllowed = true
filters 
Список фильтров	 См. описание структуры фильтров. Для указания в данном списке доступны поля, у которых filteringAllowed = true


Information	
Поля агрегации, учитывающие начальный остаток товара и денежный остаток (StartBalance.Amount, StartBalance.Money, FinalBalance.Amount, FinalBalance.Money) вычисляются суммированием всей таблицы проводок за все время работы системы (всей базы данных) без каких-либо оптимизаций. То есть, такой запрос может выполняться очень долго и замедлять работу сервера.
Если начальный остаток необходим, оставляйте в этом OLAP-запросе только те поля группировки, по которым он действительно необходим (как правило, это  Account.Name и Product.Name), и вызывайте такой запрос как можно реже и в не рабочее время.

В 5.2 добавлено API для быстрого получения остатков: Отчеты по балансам. Во всех случаях рекомендуется пользоваться им вместо OLAP.

В 5.5 OLAP-отчеты с остатками оптимизированы с использованием балансовых таблиц ATransactionSum, ATransactionBalance, при условии, что применяются группировки и фильтры по полям из этих таблиц, см. признак StartBalanceOptimizable в описании полей.

То есть, правильно составленный запрос приведет к суммированию не всей таблицы проводок, а только лишь открытого периода. Обратите особое внимание на то, что оптимизировано только поле Account.Name (счет "текущей" стороны проводки, в том числе склад), а не Store (первый попавшийся "склад" проводки, взятый из: левой, правой части проводки, строки документа или самого документа).

Фильтры
Фильтр по значению 
JSON
"FieldName": {
"filterType": "filterTypeEnum",
"values": ["Value1","Value2",...,"ValueN"]
}

Работает для полей с типами:

ENUM
STRING
Название	Значение	Описание
FieldName
Имя поля для фильтрации	
Поле FieldName из возвращаемой reports/olap/columns структуры

filterType
IncludeValues / ExcludeValues	
IncludeValues - в фильтрации участвуют только перечисленные значения поля

ExcludeValues - в фильтрации участвуют значения поля, за исключением перечисленных

values 
Список значений поля	В зависимости от типа поля, это могут быть или enum из Расшифровки кодов базовых типов или текстовое значение поля
JSON
"DeletedWithWriteoff": {
"filterType": "ExcludeValues",
"values": ["DELETED_WITH_WRITEOFF","DELETED_WITHOUT_WRITEOFF"]
},
"OrderDeleted": {
"filterType": "IncludeValues",
"values": ["NOT_DELETED"]
}
Фильтр по диапазону 
JSON
"FieldName": {
"filterType": "Range",
"from": Value1,
"to": Value2,
"includeLow": booleanValue,
"includeHigh": booleanValue
}

Работает для полей с типами:

INTEGER
PERCENT
AMOUNT
MONEY
Название	Значение	Описание
FieldName
Имя поля для фильтрации	
Поле FieldName из возвращаемой reports/olap/columns структуры

filterType
 Range	Фильтр по диапазону значений
from	Нижняя граница диапазона	Значение в формате, соответствующем типу поля
to	Верхняя граница диапазона	Значение в формате, соответствующем типу поля
includeLow	true/false	
Необязательное, по умолчанию true

true - нижняя граница диапазона включается в фильтр

false - нижняя граница диапазона не включается в фильтр

includeHigh	true/false	
Необязательное, по умолчанию false

true - верхняя граница диапазона включается в фильтр

false - верхняя граница диапазона не включается в фильтр

JSON
"SessionNum": {
"filterType": "Range",
"from": 758,
"to": 760,
"includeHigh": true
}

Фильтр по дате 
JSON
"FieldName": {
"filterType": "DateRange",
"periodType": "periodTypeEnum",
"from": "fromDateTime",
"to": "toDateTime",
"includeLow": booleanValue,
"includeHigh": booleanValue
}

Работает для полей с типами:

DATETIME
DATE
Название	Значение	Описание
FieldName 
Имя поля для фильтрации	
Поле FieldName из возвращаемой reports/olap/columns структуры

filterType
DateRange	Фильтр по диапазону значений
periodType
CUSTOM - вручную

OPEN_PERIOD - текущий открытый период

TODAY - сегодня

YESTERDAY - вчера

CURRENT_WEEK - текущая неделя

CURRENT_MONTH - текущий месяц

CURRENT_YEAR - текущий год

LAST_WEEK - прошлая неделя

LAST_MONTH - прошлый месяц

LAST_YEAR - прошлый год

Если период CUSTOM, то период задается вручную, используются поля from, to, includeLow, includeHigh

Для остальных типов периода данные параметры игнорируются (можно не использовать), кроме параметра from, его передача обязательна, его значение может быть любым.

from	Начальная дата	
Дата в формате yyyy-MM-dd'T'HH:mm:ss.SSS

to	Конечная дата	Дата в формате yyyy-MM-dd'T'HH:mm:ss.SSS
includeLow	true/false	
Необязательное, по умолчанию true

true - нижняя граница диапазона включается в фильтр

false - нижняя граница диапазона не включается в фильтр

includeHigh	true/false	Необязательное, по умолчанию false
true - верхняя граница диапазона включается в фильтр. Внимание: включение верхней границы имеет смысл только у полей, выдающих округленную ДАТУ, а не ДАТУ-ВРЕМЯ.

false - верхняя граница диапазона не включается в фильтр



Information	
В OLAP-отчете по проводкам ("reportType": "TRANSACTIONS") для фильтрации по *дате* рекомендуется использовать поле DateTime.DateTyped(или DateTime.Typed — но это дата-время)

В OLAP-отчете по продажам, а также доставкам используется поле OpenDate.Typed.

В 4.1 вместо отсутствующих полей OpenDate.Typed и DateTime.DateTyped используются поля OpenDate и DateTime.OperDayFilter соответственно.

Начиная с 5.5, каждый OLAP-запрос должен содержать фильтр по дате

JSON
"OpenDate.Typed": {
"filterType": "DateRange",
"periodType": "CUSTOM",
"from": "2014-01-01T00:00:00.000",
"to": "2014-01-03T00:00:00.000" 
}
Фильтр по дате и времени
XML
"filters": { 
"OpenDate.Typed": { 
"filterType": "DateRange", 
"periodType": "CUSTOM", 
"from": "2018-09-04", 
"to": "2018-09-04", 
"includeLow": true, 
"includeHigh": true 
},
"OpenTime": {
"filterType": "DateRange",
"periodType": "CUSTOM",
"from": "2018-09-04T01:00:00.000",
"to": "2018-09-04T23:00:00.000",
"includeLow": true,
"includeHigh": true
}
}

Ответ
JSON
{
  "data": [
    {
      "GroupFieldName1": "Value11",
      "GroupFieldName2": "Value12",
       ...,
      "GroupFieldNameN": "Value1N",
      "AggregateFieldName1": "Value11",
      "AggregateFieldName1": "Value12",
       ...,
      "AggregateFieldNameM": "Value1M"
    },
    ...,
    {
      "GroupFieldName1": "ValueK1",
      "GroupFieldName2": "ValueK2",
       ...,
      "GroupFieldNameN": "ValueKN",
      "AggregateFieldName1": "ValueK1",
      "AggregateFieldName1": "ValueK2",
       ...,
      "AggregateFieldNameM": "ValueKM"
    }
  ],
  "summary": [
   [
      {
         
      },
      {
        "AggregateFieldName1": "TotalValue1",
        "AggregateFieldName2": "TotalValue2",
        ...,
        "AggregateFieldNameM": "TotalValueM"
      }
    ],
    [
      {
        "GroupFieldName1": "Value11"
      },
      {
        "AggregateFieldName1": "TotalValue11",
        "AggregateFieldName2": "TotalValue12",
        ...,
        "AggregateFieldNameM": "TotalValue1M"
      }
    ],
    ...,
   [
      {
        "GroupFieldName1": "Value1",
        ...
        "GroupFieldNameN": "ValueN",
      },
      {
        "AggregateFieldName1": "TotalValue11",
        "AggregateFieldName2": "TotalValue12",
        ...,
        "AggregateFieldNameM": "TotalValue1M"
      }
   ],
   ...
  ]
}

Название	Значение	Описание
data	Данные отчета	Линейные данные отчета (построчно), одна запись внутри блока соответствует одной строке в гриде iikoOffice
summary	Промежуточные и общие итоги по отчету	
Список блоков, состоящих из двух структур.

В первой структуре - список полей, по которым собраны промежуточные итоги, в качестве элементов этой структуры представлены поля, которые используются для группировки. Количество элементов в структуре отличается и может быть:
пустым - это значит, что во втором блоке представлены общие итоги по отчету
список полей группировки, по которым собраны промежуточные итоги. Список имеет длину от 1 до числа полей группировки. Поля добавляются к списку в порядке их следования в запросе. 
Во второй - собственно промежуточные итоги. В качестве элементов данной структуры представлены поля, которые используются для агрегации. Количество элементов этой структуры фиксировано и равно количеству полей для агрегации.
При параметре запроса summary = false (olap, olap_presetId). "summary": [ ]  будет пустой. C Version (iiko) 5.3


Примеры вызова OLAP-отчетов по продажам
[-] Выручка по типам оплат
POST Request	https://localhost:8080/resto/api/v2/reports/olap?key=99939171-551a-f54b-5163-366e773c40ac
Тело запроса
Код

{
  "reportType": "SALES",
  "groupByRowFields": [
    "PayTypes",
    "OpenDate"
  ],
  "aggregateFields": [
    "GuestNum",
    "DishSumInt",
    "DishDiscountSumInt",
    "UniqOrderId"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
  "DeletedWithWriteoff": {
      "filterType": "ExcludeValues",
      "values": ["DELETED_WITH_WRITEOFF","DELETED_WITHOUT_WRITEOFF"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ


Код

{
  "data": [
    {
      "DishDiscountSumInt": 0,
      "DishSumInt": 1600,
      "GuestNum": 2,
      "OpenDate": "2014.01.01",
      "PayTypes": "(без оплаты)",
      "UniqOrderId": 2
    },


https://localhost:8080/resto/api/v2/reports/olap?key=99939171-551a-f54b-5163-366e773c40ac
Тело запроса
Код

{
  "reportType": "SALES",
  "groupByRowFields": [
    "DishName",
    "OpenDate",
    "CashRegisterName"
  ],
  "aggregateFields": [
    "DishSumInt",
    "DishDiscountSumInt"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ
JSON
{
  "data": [
    {
      "CashRegisterName": "Cash_Register_Name",
      "DishDiscountSumInt": 80,
      "DishName": "Dish_Name",
      "DishSumInt": 80,
      "OpenDate": "2014.01.01"
    },
    {
      "CashRegisterName": "Cash_Register_Name",
      "DishDiscountSumInt": 320,
      "DishName": "Dish_Name",
      "DishSumInt": 320,
      "OpenDate": "2014.01.02"
    },


https://localhost:8080/resto/api/v2/reports/olap?key=99939171-551a-f54b-5163-366e773c40ac
Тело запроса
Код

{
  "reportType": "SALES",
  "groupByRowFields": [
    "OpenDate",
    "HourClose"
  ],
  "aggregateFields": [
    "GuestNum",
    "DishSumInt",
    "DishDiscountSumInt",
    "UniqOrderId"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ
Код

{
  "data": [
    {
      "DishDiscountSumInt": 1892.5,
      "DishSumInt": 1950,
      "GuestNum": 5,
      "HourClose": "16",
      "OpenDate": "2014.01.01",
      "UniqOrderId": 5
    },
    {
      "DishDiscountSumInt": 31815.75,
      "DishSumInt": 34700,
      "GuestNum": 34,
      "HourClose": "17",
      "OpenDate": "2014.01.01",
      "UniqOrderId": 34
    },

https://localhost:8080/resto/api/v2/reports/olap?key=99939171-551a-f54b-5163-366e773c40ac
Тело запроса
Код


{
  "reportType": "SALES",
  "groupByRowFields": [
    "DishCategory"
  ],
  "aggregateFields": [
    "GuestNum",
    "DishSumInt",
    "DishDiscountSumInt",
    "UniqOrderId"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ 
Код


{
  "data": [
    {
      "DishCategory": null,
      "DishDiscountSumInt": 8967.73,
      "DishSumInt": 9900,
      "GuestNum": 88,
      "UniqOrderId": 93
    },
    {
      "DishCategory": "Без скидки",
      "DishDiscountSumInt": 80296.57,
      "DishSumInt": 84800,
      "GuestNum": 86,
      "UniqOrderId": 87
    },


https://localhost:8080/resto/api/v2/reports/olap?key=b785c815-f06d-947c-3fb5-3052a2df7fd8
Тело запроса
Код


{
  "reportType": "SALES",
  "groupByRowFields": [
    "OpenDate"
  ],
  "aggregateFields": [
    "GuestNum",
    "DishSumInt",
    "DishDiscountSumInt",
    "UniqOrderId"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ
Код


{
  "data": [
    {
      "DishDiscountSumInt": 186521.5,
      "DishSumInt": 198795,
      "GuestNum": 186,
      "OpenDate": "2014.01.01",
      "UniqOrderId": 196
    },
    {
      "DishDiscountSumInt": 279318,
      "DishSumInt": 292240,
      "GuestNum": 271,
      "OpenDate": "2014.01.02",
      "UniqOrderId": 286
    }
  ],


https://localhost:8080/resto/api/v2/reports/olap?key=b785c815-f06d-947c-3fb5-3052a2df7fd8 
Запрос
JSON
{
  "reportType": "SALES",
  "groupByRowFields": [
    "WaiterName"
  ],
  "aggregateFields": [
    "DishSumInt",
    "DishDiscountSumInt"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ
JSON
{
  "data": [
    {
      "DishDiscountSumInt": 36186.25,
      "DishSumInt": 38475,
      "WaiterName": "Water_Name"
      
    },
    {
      "DishDiscountSumInt": 29935,
      "DishSumInt": 31445,
      "WaiterName": "Water_Name"
      
    },
    {
      "DishDiscountSumInt": 76610,
      "DishSumInt": 78970,
      "WaiterName": "Water_Name"
      
    },



