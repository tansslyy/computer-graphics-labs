# ЛР №1. Лінійні перетворення — варіант 4

Node.js (≥ 18), без зовнішніх залежностей. Інтерфейс — HTML Canvas у браузері.

## Запуск
```bash
npm start        # відкрити http://localhost:3000
npm test         # тести матриць і геометрії
```

## Структура
- `src/math/matrix3.js` — клас матриці 3×3: множення, застосування до точки, ділення на w. Конвенція `[x y 1] · M`.
- `src/transformations/euclidean.js` — п. 3.1: зсув і обертання навколо довільної точки.
- `src/transformations/affine.js` — п. 3.2–3.3: масштабування, симетрія відносно точки, афінна система координат.
- `src/transformations/projective.js` — п. 3.4: проективна система координат.
- `src/geometry/detailParams.js` — розміри деталі та їхня перевірка.
- `src/geometry/detail.js` — параметрична побудова деталі варіанту 4.
- `src/geometry/grid.js` — сітка та осі.
- `src/geometry/shapes.js` — відрізки й дуги як ламані.
- `public/js/renderer.js` — малювання на Canvas, перехід мм → пікселі, zoom і pan.
- `public/js/main.js` — панель параметрів і конвеєр перетворень.
- `server.js` — статичний сервер.
- `test/` — тести на `node:test`.
