# Publishing Normal Memory SDK to npm

## Prerequisites

1. **npm account**: Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **Login**: Run `npm login` in your terminal
3. **Version**: Update version in `package.json` before publishing

## Step-by-Step Publishing Guide

### 1. Prepare the Package

```bash
cd sdk
```

### 2. Update Version

Edit `package.json` and increment the version:

```json
{
  "version": "0.1.0"  // Use semantic versioning: major.minor.patch
}
```

**Version Guidelines:**
- `0.1.0` → `0.1.1` (patch: bug fixes)
- `0.1.0` → `0.2.0` (minor: new features, backward compatible)
- `0.1.0` → `1.0.0` (major: breaking changes)

### 3. Update Repository URLs

Edit `package.json` and update:
- `repository.url` - Your GitHub repository URL
- `bugs.url` - Your GitHub issues URL
- `homepage` - Your GitHub repository homepage

### 4. Test Locally (Optional)

```bash
# Test the package locally
npm pack
# This creates a .tgz file you can test with: npm install ./normal-memory-0.1.0.tgz
```

### 5. Login to npm

```bash
npm login
# Enter your npm username, password, and email
```

### 6. Publish

```bash
# Dry run (see what would be published)
npm publish --dry-run

# Actual publish
npm publish
```

### 7. Verify Publication

Visit: `https://www.npmjs.com/package/normal-memory`

## Updating the Package

After making changes:

1. Update version in `package.json`
2. Update `CHANGELOG.md` (if you have one)
3. Run `npm publish`

## Publishing Scoped Packages (Optional)

If you want to publish under a scope (e.g., `@yourusername/normal-memory`):

1. Update `package.json`:
```json
{
  "name": "@yourusername/normal-memory"
}
```

2. Publish with:
```bash
npm publish --access public
```

## Common Issues

### "Package name already taken"

- Choose a different name in `package.json`
- Or use a scoped package: `@yourusername/normal-memory`

### "You must verify your email"

- Check your email and verify your npm account

### "Insufficient permissions"

- Make sure you're logged in: `npm whoami`
- Check package name ownership

## Post-Publication

1. **Update README**: Add npm install instructions
2. **Create GitHub Release**: Tag the version
3. **Share**: Announce on social media, forums, etc.

## Unpublishing (Emergency Only)

⚠️ **Warning**: Only unpublish within 72 hours of publishing

```bash
npm unpublish normal-memory@0.1.0
```

For packages older than 72 hours, contact npm support.

