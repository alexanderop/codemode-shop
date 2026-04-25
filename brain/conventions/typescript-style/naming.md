# Naming

| Kind                 | Convention                                                    | Example                                                  |
| -------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| Locals               | camelCase                                                     | `productsFiltered`                                       |
| Booleans             | `is*` / `has*` / `should*`                                    | `isDisabled`, `hasProduct`                               |
| Constants            | UPPER_SNAKE_CASE                                              | `FEATURED_PRODUCT_ID`                                    |
| Const objects/arrays | UPPER_SNAKE_CASE + `as const`                                 | `IDLE_ORDER`, `DASHBOARD_ACCESS_ROLES`                   |
| Functions            | camelCase                                                     | `filterProductsByType`                                   |
| Types                | PascalCase                                                    | `OrderStatus`, `ProductItem`                             |
| Generic params       | `T`-prefixed PascalCase                                       | `TRequest`, `TFirst`, `TSecond` (never bare `T`/`K`/`U`) |
| React components     | PascalCase                                                    | `ProductItem`, `ProductsPage`                            |
| Component props type | `[Component]Props`                                            | `ProductItemProps`                                       |
| Callback props       | `on*` (`onClick`); handler funcs `handle*` (`handleClick`)    |                                                          |
| Hooks                | camelCase, `use` prefix; setter symmetric (`[name, setName]`) | `useGetProducts`                                         |
| Custom hook return   | always an object — never a tuple                              | `const { products, errors } = useGetProducts()`          |
| Acronyms             | first letter only capitalized                                 | `FaqList`, `generateUserUrl` (not `FAQList` / `URL`)     |

Avoid abbreviations unless universal.

## Comments

Default: don't write them. Names and structure carry the meaning. Keep comments for:

- the "why" that's not obvious (workarounds, hidden constraints)
- TODO references (link the issue/PR)
- TSDoc on public APIs / config types / shared library surfaces
