# Filling in Unit Test Expected Values from Known-Correct Results

## When to Use

When you have tests that:
- Exercise functionality you've manually verified works correctly
- Are missing `expect` assertions
- Need the actual output captured as the expected value

## Process

**1. Add console.log to each test without an expect:**
```typescript
const result = myFunction(input);
console.log('test name:', JSON.stringify(result, null, 2));
```

**2. Run the tests to capture output:**
```bash
pnpm test
```

**3. Copy the logged values into expect statements:**
```typescript
expect(result).toEqual([
  // paste the JSON output here
]);
```

**4. Remove the console.log statements**

**5. Run tests again to verify**

## Tips

- Use `JSON.stringify(result, null, 2)` for readable output
- Include the test name in the log to identify which output belongs where
- If values contain constants (like `RANGE_START`), replace the raw string values with the constant references in the expect
- Run tests one final time to confirm everything passes
