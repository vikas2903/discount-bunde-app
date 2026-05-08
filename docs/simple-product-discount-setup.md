# Simple Shopify Discount Setup

This example shows the smallest useful Shopify discount flow:

1. Admin app page creates one automatic discount.
2. The app stores configuration in a discount metafield.
3. Shopify runs the function on every cart recalculation.
4. The function reads the metafield config and returns discount operations.

This example uses a very simple rule:

- apply `10%` off
- to `all cart lines`
- as a `product discount`

## Mental model

The app route and the function do different jobs:

- `app route`: creates the discount record in Shopify Admin
- `function`: runs later for the buyer cart

The admin page does **not** calculate cart discounts itself.
It only saves config.

## Minimal file structure

```text
examples/
  simple-product-discount/
    app/
      routes/
        app.simple_discount.jsx
    extensions/
      simple-product-discount/
        package.json
        shopify.extension.toml
        src/
          index.js
          cart_lines_discounts_generate_run.graphql
          cart_lines_discounts_generate_run.js
```

## File purpose

### `app/routes/app.simple_discount.jsx`

Creates the automatic app discount with Admin GraphQL.

Important fields:

- `functionHandle`: connects the Admin discount record to the deployed function extension
- `discountClasses: ["PRODUCT"]`: tells Shopify this is a product discount
- `metafields`: stores JSON config like percent and message

### `extensions/simple-product-discount/shopify.extension.toml`

Registers the function extension.

Important parts:

- `type = "function"`
- `target = "cart.lines.discounts.generate.run"`
- `input_query = "src/cart_lines_discounts_generate_run.graphql"`
- metafield namespace and key

### `extensions/simple-product-discount/src/cart_lines_discounts_generate_run.graphql`

Defines what Shopify sends into the function.

This example asks for:

- cart line ids
- discount classes
- the config metafield

### `extensions/simple-product-discount/src/cart_lines_discounts_generate_run.js`

Contains the real runtime logic.

This example:

1. reads percent from metafield JSON
2. loops through cart lines
3. creates one discount candidate per line
4. returns `productDiscountsAdd`

## Request flow

### Step 1: merchant opens app page

The merchant opens your embedded admin page.

### Step 2: app route runs GraphQL mutation

The route sends `discountAutomaticAppCreate`.

That creates:

- one automatic discount owner in Shopify
- one metafield config attached to that discount

### Step 3: buyer updates cart

The buyer adds or changes products in cart.

### Step 4: Shopify runs function

Shopify automatically runs the function extension with:

- current cart data
- current discount config metafield

### Step 5: function returns operations

The function returns discount instructions.

Shopify applies them to the cart.

## Simplified data example

Saved config metafield:

```json
{
  "percentage": 10,
  "message": "10% off from app discount"
}
```

Returned function result:

```json
{
  "operations": [
    {
      "productDiscountsAdd": {
        "candidates": [
          {
            "message": "10% off from app discount",
            "targets": [
              { "cartLine": { "id": "gid://shopify/CartLine/1" } }
            ],
            "value": {
              "percentage": { "value": "10.0" }
            }
          }
        ],
        "selectionStrategy": "FIRST"
      }
    }
  ]
}
```

## How this maps to your existing code

Your current project already follows the same high-level pattern:

- dashboard page creates config
- config is saved in discount metafield
- function input query reads metafield
- function logic returns discount operations

The main difference is complexity:

- your current extension supports bundle and volume logic
- this example supports only one simple percentage rule

## Recommended learning order

Read the files in this order:

1. `examples/simple-product-discount/app/routes/app.simple_discount.jsx`
2. `examples/simple-product-discount/extensions/simple-product-discount/shopify.extension.toml`
3. `examples/simple-product-discount/extensions/simple-product-discount/src/cart_lines_discounts_generate_run.graphql`
4. `examples/simple-product-discount/extensions/simple-product-discount/src/cart_lines_discounts_generate_run.js`

## Important note

This example is intentionally isolated for learning.
It is not automatically wired into your current app navigation or deployment config.
Once you understand it, we can turn this exact example into a real working route and extension inside your app.
