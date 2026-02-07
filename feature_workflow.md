# 🚀 Feature Branch Workflow Guide

A streamlined workflow for building features with maximum GitHub activity while following best practices.

---

## 📋 How to Prompt Claude

**When you want Claude to build and implement a feature, say:**

```
Build a feature: [DESCRIBE YOUR FEATURE]

Follow the FEATURE_WORKFLOW.md process.
```

**What Claude will do:**

1. ✅ **Create a feature branch** with appropriate naming
2. ✅ **Implement the feature** (write code, make changes)
3. ✅ **Ask you to test** before any commits
4. ✅ **Wait for your confirmation** that testing passed
5. ✅ **Create atomic commits** (once you confirm)
6. ✅ **Push the branch** to GitHub
7. ✅ **Create a Pull Request** with detailed description
8. ✅ **Merge the PR** to main
9. ✅ **Add version tag** (semantic versioning)
10. ✅ **Clean up** branches

**IMPORTANT:** Claude will **NOT commit anything** until you confirm the feature works after testing.

---

## 🎯 The Workflow (Step-by-Step)

### Step 1: Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation

### Step 2: Implement the Feature

Claude writes the code and makes all necessary changes.

### Step 3: Testing (CRITICAL!)

**Before any commits:**

- Claude will ask you to test the feature
- Test thoroughly in your local environment
- Only respond "yes" or "confirmed" when it works
- If bugs found, Claude will fix them and ask you to re-test

### Step 4: Atomic Commits

**After testing confirmation**, create focused commits:

```bash
git add [specific-files]
git commit -m "type: description"
```

**Commit message types (Conventional Commits):**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting/styling
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance

**Note:** Claude should write clear commit messages but **NOT** include co-author signatures (no "Co-Authored-By: Claude" lines).

**🟩 More commits = More GitHub activity!** Break work into logical chunks when possible.

### Step 5: Push Branch

```bash
git push -u origin feature/your-feature-name
```

### Step 6: Create Pull Request

```bash
gh pr create --title "Add [Feature Name]" \
  --body "## Summary
- Feature description
- What changed
- What was added/fixed

## Changes
- File: What was modified

## Testing
- [x] Tested locally
- [x] Feature works as expected
"
```

### Step 7: Merge Pull Request

```bash
# Merge and delete branch
gh pr merge [PR-NUMBER] --merge --delete-branch

# Switch to main and pull
git checkout main
git pull origin main
```

### Step 8: Version Tag

**Semantic Versioning (vMAJOR.MINOR.PATCH):**

- `MAJOR` - Breaking changes (v2.0.0)
- `MINOR` - New features, backwards compatible (v1.2.0)
- `PATCH` - Bug fixes (v1.1.1)

```bash
git tag -a v1.2.0 -m "Added [feature name]"
git push origin v1.2.0
```

### Step 9: Cleanup

```bash
git remote prune origin
git branch -a  # Verify clean state
```

---

## 📊 GitHub Activity Per Feature

Each feature generates:

- 🟩 Branch creation
- 🟩 Commit(s) - aim for 3-5 focused commits
- 🟩 Branch push
- 🟩 Pull request creation
- 🟩 Pull request merge
- 🟩 Version tag
- 🟩 Tag push

**Total: 7+ activities per feature!** 🟩✨

---

## 🤖 Example Prompts

### Build Complete Feature

```
Build a feature: Add dark mode toggle to the navbar

Follow the FEATURE_WORKFLOW.md process.
```

### Fix a Bug

```
Build a feature: Fix the search input not clearing after submission

Follow the FEATURE_WORKFLOW.md process.
```

### Refactor Code

```
Build a feature: Refactor authentication logic to use middleware

Follow the FEATURE_WORKFLOW.md process.
```

---

## ✅ Testing Checklist

Before confirming to Claude:

- [ ] Feature works as intended
- [ ] No console errors
- [ ] Responsive design works (if UI change)
- [ ] No breaking changes to existing features
- [ ] Code follows project patterns
- [ ] Performance is acceptable

---

## 🚨 Common Mistakes

❌ **Don't:** Skip testing before committing
✅ **Do:** Always test first, commit after confirmation

❌ **Don't:** Commit directly to main
✅ **Do:** Always use feature branches

❌ **Don't:** Use vague messages ("updated files")
✅ **Do:** Use descriptive conventional commits

❌ **Don't:** Make one giant commit
✅ **Do:** Break into logical atomic commits

❌ **Don't:** Add "Co-Authored-By: Claude" signatures
✅ **Do:** Keep commits clean with just the message

---

## 📚 Quick Reference

```bash
# Complete workflow in one view
git checkout -b feature/name          # Create branch
# [Claude implements feature]
# [You test and confirm]
git add [files]                       # Stage changes
git commit -m "feat: description"     # Commit
git push -u origin feature/name       # Push branch
gh pr create --title "Title" --body "Description"  # Create PR
gh pr merge [#] --merge --delete-branch            # Merge
git checkout main && git pull         # Update main
git tag -a v1.2.0 -m "message"       # Tag version
git push origin v1.2.0               # Push tag
git remote prune origin              # Cleanup
```

---

## 💡 Pro Tips

1. **Test thoroughly** - Claude waits for your confirmation
2. **Break large features** - Consider multiple PRs for big changes
3. **Use meaningful names** - Clear branch and commit names
4. **Tag releases** - Creates extra activity + version history
5. **Keep commits logical** - Each commit should make sense independently

---

## 🎓 Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

**Remember:** Quality over quantity. Meaningful commits > Artificial activity. 🟩✨
