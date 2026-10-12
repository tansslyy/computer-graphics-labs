# ЛР №1. Лінійні перетворення — варіант 4

Node.js (≥ 18), без зовнішніх залежностей. Інтерфейс — HTML Canvas у браузері.

## Запуск
```bash
npm start        # відкрити http://localhost:3000
npm test         # тести матриць і геометрії
```

## Структура
- `src/math/matrix3.js` — матриці 3×3: зсув, обертання, масштаб, симетрія, афінна, проективна. Конвенція `[x y 1] · M`.
- `src/geometry/detailParams.js` — розміри деталі та їхня перевірка.
- `src/geometry/detail.js` — параметрична побудова деталі варіанту 4.
- `src/geometry/grid.js` — сітка та осі.
- `src/geometry/shapes.js` — відрізки й дуги як ламані.
- `public/js/renderer.js` — малювання на Canvas, перехід мм → пікселі, zoom і pan.
- `public/js/main.js` — панель параметрів і конвеєр перетворень.
- `server.js` — статичний сервер.
- `test/` — тести на `node:test`.
