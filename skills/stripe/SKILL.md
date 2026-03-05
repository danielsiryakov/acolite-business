---
name: stripe
description: Creates Stripe products, prices, and payment links using the Stripe CLI. Use when the user asks to set up payments, create products for sale, generate payment links, or manage Stripe resources.
metadata:
  author: nanoclaw
  version: "1.0"
---

# Stripe CLI Skill

You have access to the Stripe CLI for payment processing. The `STRIPE_API_KEY` environment variable is already configured.

## Quick Reference

### Create a Product
```bash
stripe products create --name "Product Name" --description "Description"
```

### Create a Price
```bash
stripe prices create --product prod_xxx --unit-amount 4900 --currency usd
```
Note: Amount is in cents (4900 = $49.00)

### Create a Payment Link
```bash
stripe payment_links create --line-items[0][price]=price_xxx --line-items[0][quantity]=1
```

### List Resources
```bash
stripe products list --limit 10
stripe prices list --limit 10
stripe payment_links list --limit 10
```

## Common Workflows

### Add Payment to a Website

1. **Create the product:**
   ```bash
   stripe products create --name "Premium Plan" --description "Full access to all features"
   ```
   Note the `id` from the output (e.g., `prod_xxx`)

2. **Create a price for the product:**
   ```bash
   stripe prices create --product prod_xxx --unit-amount 4900 --currency usd
   ```
   Note the `id` from the output (e.g., `price_xxx`)

3. **Create a payment link:**
   ```bash
   stripe payment_links create --line-items[0][price]=price_xxx --line-items[0][quantity]=1
   ```
   The output includes the `url` field - this is the payment link to embed in the website.

4. **Embed the payment link** in the website as a button or link.

### Recurring Subscription

For monthly/yearly subscriptions, add the `--recurring` flag to price creation:

```bash
# Monthly subscription
stripe prices create --product prod_xxx --unit-amount 1999 --currency usd \
  --recurring[interval]=month

# Yearly subscription
stripe prices create --product prod_xxx --unit-amount 19900 --currency usd \
  --recurring[interval]=year
```

### One-Time Payment

For one-time purchases (no recurring):
```bash
stripe prices create --product prod_xxx --unit-amount 9900 --currency usd
```

## Output Parsing

Stripe CLI outputs JSON by default. Use `jq` to extract specific fields:

```bash
# Get just the product ID
stripe products create --name "Test" | jq -r '.id'

# Get just the payment link URL
stripe payment_links create --line-items[0][price]=price_xxx --line-items[0][quantity]=1 | jq -r '.url'
```

## Currency Codes

Common currency codes:
- `usd` - US Dollars
- `eur` - Euros
- `gbp` - British Pounds
- `cad` - Canadian Dollars
- `aud` - Australian Dollars

## Error Handling

If you get authentication errors, the `STRIPE_API_KEY` may not be set. Check with:
```bash
echo $STRIPE_API_KEY | head -c 10
```

If it's empty, ask the user to add their Stripe API key to the `.env` file.

## Best Practices

1. **Use descriptive product names** - They appear on the checkout page
2. **Include product descriptions** - Helps customers understand what they're buying
3. **Test with test mode keys** - Keys starting with `sk_test_` are for testing
4. **Save payment links** - Store them in the project for easy reference

## Example Interaction

User: "Create a product called 'Pro Plan' for $49/month and give me the payment link"

Steps:
1. Create product: `stripe products create --name "Pro Plan" --description "Professional plan with all features"`
2. Create recurring price: `stripe prices create --product <prod_id> --unit-amount 4900 --currency usd --recurring[interval]=month`
3. Create payment link: `stripe payment_links create --line-items[0][price]=<price_id> --line-items[0][quantity]=1`
4. Return the URL from the payment link response
