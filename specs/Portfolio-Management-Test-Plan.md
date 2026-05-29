# Portfolio Management Test Plan
## Eseye Portal - SPA-179

**Document Version:** 1.0  
**Date Created:** May 19, 2026  
**Last Updated:** May 19, 2026  
**Test Plan Status:** Ready for Execution  

---

## Executive Summary

This document outlines comprehensive testing scenarios for the **Manage Portfolios** feature (SPA-179) in the Eseye Portal. The feature allows Portfolio Managers to view, search, filter, sort, and manage client portfolios from a centralized dashboard. This test plan covers functional testing, edge cases, and user workflow validation.

---

## Project Information

| Attribute | Value |
|-----------|-------|
| Project | Eseye Portal Single Page Application |
| Feature | Portfolio Management - Manage Portfolios |
| Jira Issue | SPA-179 |
| Feature Type | Story |
| Parent Epic | SPA-178 |
| Test Environment | QAN (https://portal.qan.aws.eseye.io) |
| Test Credentials | Username: resellerqa, Password: Password#1 |

---

## User Story

**As a** Portfolio Manager  
**I want to** view, search, and manage all client portfolios from a single dashboard  
**So that** I can efficiently monitor their status, currency, and invoicing entity, and create new portfolios when needed.

---

## Acceptance Criteria

### 1. Access Control
- [ ] User can see Manage Portfolio menu only with `capabilityPortfolioGet` permission
- [ ] Users without permission cannot access portfolio dashboard

### 2. View Portfolios
- [ ] Portfolio table displays all accessible portfolios
- [ ] Default columns visible: Portfolio Title-ID, Currency, Invoicing Entity, Status
- [ ] Status values have clear colour coding
- [ ] Users can customize visible columns
- [ ] Column preferences are saved and persist on return visits
- [ ] Clicking portfolio title/ID navigates to detailed portfolio page

### 3. Search Functionality
- [ ] Search works with full and partial words
- [ ] Search is case-insensitive
- [ ] Results update immediately as user types
- [ ] Empty state displays when no results match

### 4. Filtering and Sorting
- [ ] Users can filter by status
- [ ] Users can filter by currency
- [ ] Users can filter by invoicing entity
- [ ] Multiple filters can be applied simultaneously
- [ ] Table columns are sortable (ascending/descending)

### 5. Pagination
- [ ] Default display shows limited rows (20, 25, 50, etc.)
- [ ] Users can navigate between pages
- [ ] Users can select rows per page (10, 25, 50, 100)
- [ ] Pagination summary displays "Showing X to Y of Z portfolios"
- [ ] Pagination state resets after filtering/searching

### 6. Responsive Feedback
- [ ] Loading indicator appears during data fetch
- [ ] Create Portfolio button is prominently displayed
- [ ] Success/error messages appear for operations
- [ ] Session timeout is handled appropriately

---

## Test Scope

### In Scope
✅ Portfolio viewing and display  
✅ Search functionality  
✅ Filtering capabilities  
✅ Sorting operations  
✅ Pagination controls  
✅ Column customization  
✅ Portfolio details navigation  
✅ User feedback and loading states  
✅ Error handling  
✅ Session management  

### Out of Scope
❌ Portfolio creation workflows  
❌ Portfolio editing/update operations  
❌ Portfolio deletion  
❌ Advanced analytics/reporting  
❌ Export functionality  

---

## Test Suite Organization

### Suite 1: Portfolio Access and Permissions
**Objective:** Verify proper access control based on user permissions

#### Test 1.1: User with Permission Can Access Manage Portfolios
**Pre-conditions:**
- User logged in with `capabilityPortfolioGet` permission
- User navigated to dashboard

**Steps:**
1. Navigate to main menu/sidebar
2. Locate "Manage Portfolios" menu option
3. Click on "Manage Portfolios"

**Expected Results:**
- Manage Portfolios page loads successfully
- Portfolio listing table is displayed
- No access denied/unauthorized message appears

**Post-conditions:**
- Portfolio dashboard is fully functional

---

#### Test 1.2: User Without Permission Cannot Access Dashboard
**Pre-conditions:**
- User logged in without `capabilityPortfolioGet` permission
- User navigated to dashboard

**Steps:**
1. Navigate to main menu/sidebar
2. Observe for "Manage Portfolios" menu option
3. Attempt direct URL access: `/portfolio/manage-portfolios`

**Expected Results:**
- "Manage Portfolios" menu is NOT visible or disabled
- Direct URL access shows unauthorized/access denied message
- User is redirected to appropriate page

**Post-conditions:**
- User cannot access portfolio functionality

---

### Suite 2: Portfolio Viewing and Display
**Objective:** Verify portfolio data is displayed correctly with proper formatting

#### Test 2.1: Portfolio Table Displays All Accessible Portfolios
**Pre-conditions:**
- User logged in with proper permissions
- Portfolio dashboard page loaded
- Multiple portfolios exist in system

**Steps:**
1. Navigate to Manage Portfolios page
2. Observe portfolio table content
3. Count displayed portfolios

**Expected Results:**
- Portfolio table displays
- All accessible portfolios are listed
- No portfolios are missing from the list
- Table shows a subset if pagination is active

**Post-conditions:**
- Portfolio list is complete for current page

---

#### Test 2.2: Default Columns Display Correctly
**Pre-conditions:**
- Portfolio dashboard loaded
- Portfolio table visible

**Steps:**
1. Examine table headers
2. Review portfolio data rows
3. Verify column content accuracy

**Expected Results:**
- Column headers visible:
  - Portfolio Title - ID
  - Currency (GBP, USD, BRL, etc.)
  - Invoicing Entity (Eseye UK, Eseye Brazil, etc.)
  - Status (with colour coding)
- Data in each column is accurate and properly formatted
- Colour coding is consistent across all status values

**Post-conditions:**
- Table displays default structure correctly

---

#### Test 2.3: Portfolio Status Has Colour Coding
**Pre-conditions:**
- Portfolio table loaded
- Multiple portfolios with different statuses

**Steps:**
1. Observe portfolio status column
2. Note colour associations for each status
3. Compare across multiple portfolios

**Expected Results:**
- Each status has a distinct colour (e.g., Active=Green, Inactive=Gray)
- Colour coding is consistent across all rows
- Colour-blind accessible indicators exist (icons/text labels)

**Post-conditions:**
- Status visual differentiation is clear

---

#### Test 2.4: Empty State Displays When No Portfolios
**Pre-conditions:**
- User has permission but no accessible portfolios
- Portfolio dashboard loaded

**Steps:**
1. Navigate to Manage Portfolios page
2. Observe content area

**Expected Results:**
- "No portfolios found" or similar empty state message
- "Create Portfolio" button is visible and highlighted
- User is prompted to create first portfolio

**Post-conditions:**
- Empty state provides clear guidance

---

### Suite 3: Column Customization
**Objective:** Verify users can customize and persist column preferences

#### Test 3.1: User Can Toggle Column Visibility
**Pre-conditions:**
- Portfolio table displayed with default columns
- Column configuration option visible

**Steps:**
1. Click on "Configure Columns" or settings button
2. In modal, uncheck one visible column
3. Check one hidden column
4. Apply/confirm changes

**Expected Results:**
- Column configuration modal appears
- Checkboxes toggle successfully
- Table updates to reflect changes
- Previously hidden column appears
- Unchecked column disappears

**Post-conditions:**
- Column layout updated

---

#### Test 3.2: Column Preferences Are Saved
**Pre-conditions:**
- Column customization completed in Test 3.1
- Column configuration changes applied

**Steps:**
1. Navigate away from portfolio page
2. Return to Manage Portfolios page

**Expected Results:**
- Previously customized column layout is preserved
- Same columns visible as before navigation
- Custom preference persisted in user settings

**Post-conditions:**
- Column state saved successfully

---

#### Test 3.3: User Can Reset to Default Columns
**Pre-conditions:**
- Custom column layout applied
- Column configuration menu available

**Steps:**
1. Open column configuration
2. Click "Reset to Default" button
3. Confirm reset action

**Expected Results:**
- All custom column changes are reverted
- Default column layout restored
- Table shows standard columns again

**Post-conditions:**
- Default layout restored

---

### Suite 4: Search Functionality
**Objective:** Verify search filters portfolios accurately in real-time

#### Test 4.1: Search with Full Words
**Pre-conditions:**
- Portfolio table displayed with multiple portfolios
- Search field visible

**Steps:**
1. Locate search input field
2. Enter full portfolio name (e.g., "Securebase Ltd")
3. Observe results

**Expected Results:**
- Only portfolios matching search term displayed
- Matching portfolio appears in results
- Non-matching portfolios filtered out
- Results update immediately

**Post-conditions:**
- Search filter applied correctly

---

#### Test 4.2: Search with Partial Words
**Pre-conditions:**
- Portfolio table displayed
- Search field visible

**Steps:**
1. Enter partial word (e.g., "Secure")
2. Observe filtered results

**Expected Results:**
- All portfolios containing "Secure" appear (Securebase, SecureNet, etc.)
- Portfolios without partial match are hidden
- Results contain substring matches

**Post-conditions:**
- Partial search working

---

#### Test 4.3: Search Is Case-Insensitive
**Pre-conditions:**
- Portfolio table displayed
- Portfolio with known name exists

**Steps:**
1. Search for "sec" (lowercase)
2. Note results
3. Clear search and search for "SEC" (uppercase)

**Expected Results:**
- Results identical for both searches
- Case does not affect search matching
- Both lowercase and uppercase return same portfolios

**Post-conditions:**
- Case-insensitive search confirmed

---

#### Test 4.4: Search Results Update Immediately
**Pre-conditions:**
- Portfolio dashboard loaded
- Search field active

**Steps:**
1. Type "S" in search field
2. Observe results filtering to portfolios starting with S
3. Continue typing: "e", "c", "u", "r", "e", "b", "a", "s", "e"
4. Clear search field completely

**Expected Results:**
- Results narrow with each keystroke
- Search responds without delay
- Full portfolio list restored when search cleared
- Real-time filtering confirmed

**Post-conditions:**
- Real-time search functionality working

---

#### Test 4.5: Search Handles No Results Gracefully
**Pre-conditions:**
- Portfolio table loaded
- Search field visible

**Steps:**
1. Search for non-existent term (e.g., "XYZ123")
2. Observe results

**Expected Results:**
- No portfolios displayed in table
- "No portfolios found" message shown
- Clear search option provided
- Create Portfolio button available

**Post-conditions:**
- Empty search state handled properly

---

### Suite 5: Filtering and Sorting
**Objective:** Verify filtering and sorting operations work individually and together

#### Test 5.1: Filter Portfolios by Status
**Pre-conditions:**
- Portfolio table loaded with multiple statuses
- Filter control visible

**Steps:**
1. Open filter menu
2. Select specific status (e.g., "Active")
3. Apply filter

**Expected Results:**
- Table updates to show only selected status
- Other statuses are hidden
- Filter indicator shows active filter
- Row count decreases appropriately

**Post-conditions:**
- Status filter applied

---

#### Test 5.2: Filter Portfolios by Currency
**Pre-conditions:**
- Portfolio table loaded
- Filter control available

**Steps:**
1. Open filter menu
2. Select currency (e.g., "USD")
3. Apply filter

**Expected Results:**
- Only USD portfolios displayed
- Other currencies filtered out
- Currency filter indicator visible
- Results update correctly

**Post-conditions:**
- Currency filter applied

---

#### Test 5.3: Filter Portfolios by Invoicing Entity
**Pre-conditions:**
- Portfolio table loaded
- Filter control available

**Steps:**
1. Open filter menu
2. Select invoicing entity (e.g., "Eseye UK")
3. Apply filter

**Expected Results:**
- Only portfolios from Eseye UK displayed
- Other entities filtered
- Entity filter indicator shown
- Row count reflects filter

**Post-conditions:**
- Entity filter applied

---

#### Test 5.4: Apply Multiple Filters Simultaneously
**Pre-conditions:**
- Portfolio table loaded
- Filter control available

**Steps:**
1. Apply Status = "Active" filter
2. Additionally apply Currency = "USD" filter
3. Additionally apply Entity = "Eseye Brazil" filter

**Expected Results:**
- All three filters active and displayed
- Table shows only portfolios matching ALL criteria
- Row count reflects intersection of filters
- Filters work in logical AND combination

**Post-conditions:**
- Multi-filter combination working

---

#### Test 5.5: Sort Portfolio Table Columns
**Pre-conditions:**
- Portfolio table displayed
- Column headers visible

**Steps:**
1. Click on sortable column header (e.g., "Portfolio Title")
2. Observe sort direction indicator
3. Click same header again
4. Observe sort reversal

**Expected Results:**
- First click sorts ascending (A-Z)
- Sort indicator (arrow) appears
- Second click reverses to descending (Z-A)
- Table re-sorts with each click
- Sort direction visually indicated

**Post-conditions:**
- Sorting functionality working

---

#### Test 5.6: Filters and Sorting Work Together
**Pre-conditions:**
- Portfolio table loaded
- Filter and sort controls available

**Steps:**
1. Apply filter (e.g., Status = "Active")
2. Sort filtered results by Portfolio Title
3. Verify sort on filtered data

**Expected Results:**
- Filter applied first
- Sort applied to filtered results only
- Active portfolio entries sorted alphabetically
- No filtering/sorting conflicts occur
- Results accurate and consistent

**Post-conditions:**
- Filter + sort combination working

---

### Suite 6: Pagination
**Objective:** Verify pagination controls and page navigation

#### Test 6.1: Pagination Shows Limited Rows by Default
**Pre-conditions:**
- Portfolio table loaded
- 50+ portfolios exist in system

**Steps:**
1. Navigate to Manage Portfolios page
2. Count portfolio rows displayed
3. Compare to total portfolio count

**Expected Results:**
- Limited number of rows displayed (20, 25, 50, or 100)
- Not all 50+ portfolios on single page
- Pagination controls visible
- Summary shows "Showing X to Y of Z portfolios"

**Post-conditions:**
- Pagination active

---

#### Test 6.2: Navigate Between Pages
**Pre-conditions:**
- Portfolio table with pagination displayed
- Multiple pages available

**Steps:**
1. Observe current page (Page 1)
2. Click "Next" button or page "2"
3. Observe new portfolio set
4. Click "Previous" button
5. Return to page 1

**Expected Results:**
- Next button navigates to page 2
- Different portfolio set displayed
- Previous button returns to page 1
- Same portfolios displayed as before
- Page indicator updates correctly

**Post-conditions:**
- Page navigation working

---

#### Test 6.3: Change Rows Per Page
**Pre-conditions:**
- Portfolio table with pagination displayed
- Default showing 20 rows per page

**Steps:**
1. Locate "Rows per page" dropdown
2. Select 50 from options (10, 25, 50, 100)
3. Observe table update
4. Select 10 from dropdown

**Expected Results:**
- First change shows 50 portfolios per page
- Pagination count updates
- Fewer pages available with 50 rows
- Selecting 10 shows only 10 rows
- More pages available with 10 rows

**Post-conditions:**
- Rows per page control working

---

#### Test 6.4: Pagination Summary Is Accurate
**Pre-conditions:**
- Portfolio table with pagination displayed
- Multiple pages with 20 rows per page

**Steps:**
1. Observe pagination summary on page 1
2. Navigate to page 2
3. Observe pagination summary update
4. Change rows per page to 50
5. Observe summary on page 1 with new setting

**Expected Results:**
- Page 1: "Showing 1 to 20 of Z portfolios"
- Page 2: "Showing 21 to 40 of Z portfolios"
- After rows change: "Showing 1 to 50 of Z portfolios"
- Summary accurately reflects pagination state

**Post-conditions:**
- Pagination summary accurate

---

#### Test 6.5: Pagination Resets After Search
**Pre-conditions:**
- Portfolio table on page 2
- Search functionality available

**Steps:**
1. Navigate to page 2 of portfolio list
2. Apply search filter (e.g., "test")
3. Observe pagination state
4. Clear search filter

**Expected Results:**
- Search results pagination starts at page 1
- Or pagination resets to show filtered results
- Clearing search returns to full list
- Pagination state managed correctly

**Post-conditions:**
- Search/pagination interaction working

---

### Suite 7: Portfolio Details View
**Objective:** Verify portfolio detail page navigation and content

#### Test 7.1: Click Portfolio Title to View Details
**Pre-conditions:**
- Portfolio table displayed
- Portfolio titles are clickable

**Steps:**
1. Click on portfolio title or ID
2. Wait for page load
3. Observe detail page content

**Expected Results:**
- Portfolio detail page loads
- URL changes to portfolio detail view
- Detailed portfolio information displayed
- Navigation back to list available

**Post-conditions:**
- Portfolio detail page accessible

---

#### Test 7.2: Portfolio Detail Page Shows Accurate Information
**Pre-conditions:**
- Portfolio detail page loaded
- Portfolio from table clicked

**Steps:**
1. Compare portfolio name with table entry
2. Verify portfolio ID matches
3. Check currency against table display
4. Confirm invoicing entity
5. Verify status matches

**Expected Results:**
- Portfolio title matches table entry
- Portfolio ID correct
- Currency accurate
- Invoicing entity correct
- Status matches table view
- Additional details displayed if applicable

**Post-conditions:**
- Portfolio information verified

---

### Suite 8: User Feedback and Responsiveness
**Objective:** Verify loading states and user feedback mechanisms

#### Test 8.1: Loading Indicator Appears During Data Fetch
**Pre-conditions:**
- Network conditions simulated or naturally slow
- Portfolio page navigated to

**Steps:**
1. Navigate to Manage Portfolios page
2. Watch for loading indicator
3. Observe until page loads

**Expected Results:**
- Loading spinner/indicator visible while fetching
- Indicator disappears once data loads
- Page is interactive after loading completes

**Post-conditions:**
- Loading state managed properly

---

#### Test 8.2: Create Portfolio Button Is Prominent
**Pre-conditions:**
- Portfolio dashboard loaded
- Button visible

**Steps:**
1. Observe page layout
2. Locate Create Portfolio button
3. Verify button is easily accessible

**Expected Results:**
- "Create Portfolio" button visible and prominent
- Button is clearly labeled
- Button is easily clickable
- Located in logical position (top, right, or floating)

**Post-conditions:**
- Button accessibility confirmed

---

#### Test 8.3: Success Messages Display After Operations
**Pre-conditions:**
- Create Portfolio form available
- Valid portfolio data prepared

**Steps:**
1. Create new portfolio with valid data
2. Submit form
3. Observe result

**Expected Results:**
- Success message appears (e.g., "Portfolio created successfully")
- Message displays for 3-5 seconds
- User redirected to portfolio list or detail page
- New portfolio visible in list

**Post-conditions:**
- Success feedback provided

---

#### Test 8.4: Error Messages Display For Failed Operations
**Pre-conditions:**
- Create Portfolio form available

**Steps:**
1. Attempt to create portfolio with invalid data (missing required fields)
2. Submit form
3. Observe error handling

**Expected Results:**
- Clear error message displayed
- Specifies what went wrong (e.g., "Portfolio name is required")
- Form not submitted
- User can correct errors and retry

**Post-conditions:**
- Error handling working

---

### Suite 9: Edge Cases and Error Handling
**Objective:** Verify application handles edge cases gracefully

#### Test 9.1: Handle Network Timeout
**Pre-conditions:**
- Slow network conditions or network interruption
- Portfolio page loading

**Steps:**
1. Navigate to portfolio page with network delay
2. Wait for timeout
3. Observe error handling
4. Click Retry button if available

**Expected Results:**
- Error message displayed (not hung/stuck)
- "Retry" button available
- User not blocked from interaction
- Retry attempts to reload data

**Post-conditions:**
- Network error handled gracefully

---

#### Test 9.2: Handle Portfolio with Long Names
**Pre-conditions:**
- Portfolio with very long name in system
- Portfolio table displayed

**Steps:**
1. View portfolio with long name
2. Observe table layout
3. Check for text wrapping or truncation

**Expected Results:**
- Long name displays without breaking layout
- Text wrapped or truncated appropriately
- Tooltip shows full name on hover
- Table remains properly formatted
- No horizontal scroll needed

**Post-conditions:**
- Long name handled properly

---

#### Test 9.3: Handle Special Characters in Names
**Pre-conditions:**
- Portfolio with special characters (& " ' < > etc.)
- Portfolio table displayed

**Steps:**
1. View portfolio with special characters
2. Observe character rendering
3. Verify no display issues

**Expected Results:**
- Special characters rendered correctly
- No HTML injection or encoding issues
- Characters display as intended
- No broken layout

**Post-conditions:**
- Special characters handled safely

---

#### Test 9.4: Concurrent Operations Work Correctly
**Pre-conditions:**
- Portfolio dashboard loaded
- Multiple operations possible

**Steps:**
1. Apply search term
2. While search active, apply filter
3. While both active, apply sort

**Expected Results:**
- All three operations work together
- Results show intersection of search + filter + sort
- No conflicts or errors
- Performance remains acceptable

**Post-conditions:**
- Concurrent operations working

---

#### Test 9.5: Session Timeout Handling
**Pre-conditions:**
- User logged in and on portfolio page
- Session timeout will occur

**Steps:**
1. Keep portfolio page open for extended time (simulating session timeout)
2. Attempt an action (search, filter, navigate)
3. Observe handling

**Expected Results:**
- User redirected to login page
- Clear session expiration message
- User can log back in
- Portfolio page accessible after re-login

**Post-conditions:**
- Session timeout handled appropriately

---

## Test Environment Setup

### Prerequisites
- Browser: Chrome/Chromium (latest version)
- Test Environment: QAN (https://portal.qan.aws.eseye.io)
- Test User Account:
  - Username: `resellerqa`
  - Password: `Password#1`
  - Permissions: `capabilityPortfolioGet`

### Test Data Requirements
- Minimum 50 portfolios in system
- Portfolios with different statuses (Active, Inactive, etc.)
- Portfolios with different currencies (GBP, USD, BRL, etc.)
- Portfolios with different invoicing entities (Eseye UK, Eseye Brazil, etc.)
- Portfolios with long names (>50 characters)
- Portfolios with special characters

### Test Automation
- Framework: Playwright
- Language: TypeScript
- Test Files Location: `/tests/portfolio/`
- Seed File: `/tests/portfolio-seed.spec.ts`

---

## Test Execution Strategy

### Test Execution Order
1. **Access Control Tests** (2 tests) - Verify permissions first
2. **Portfolio Viewing Tests** (4 tests) - Basic functionality
3. **Search Tests** (5 tests) - Search operations
4. **Filtering & Sorting Tests** (6 tests) - Advanced interactions
5. **Pagination Tests** (5 tests) - Data pagination
6. **Detail View Tests** (2 tests) - Navigation
7. **Feedback & Responsiveness Tests** (4 tests) - User experience
8. **Edge Cases & Error Handling** (5 tests) - Exception scenarios

### Execution Time Estimate
- Manual Testing: 6-8 hours
- Automated Testing: 30-45 minutes
- Total with regression: 8-10 hours

### Success Criteria
- ✅ All 37 test scenarios pass
- ✅ No critical defects remain
- ✅ Performance meets SLA requirements
- ✅ No unhandled errors in console
- ✅ User experience meets acceptance criteria

---

## Known Issues and Limitations

### Known Issues
- None at time of document creation

### Test Limitations
- Cannot test multi-language support in this plan
- Advanced filtering combinations not exhaustively tested
- Browser compatibility limited to Chromium
- Performance/load testing not included

---

## Test Resources

### Team Members
- QA Lead: [Assigned]
- Test Automation Engineer: [Assigned]
- Test Data Manager: [Assigned]

### Tools
- Test Automation: Playwright
- Test Reporting: Playwright HTML Report
- Bug Tracking: Jira
- Test Management: This document

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Product Owner | | | |
| Development Lead | | | |

---

## Appendix

### Related Jira Stories
- SPA-178: Portfolio Management Epic
- SPA-197: Search Functionality - Wireframe
- SPA-250: Pagination
- SPA-461: Pagination in Integra
- SPA-477: Portfolio Management Validations in QAN

### References
- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://example.com)
- [Eseye Portal API Docs](https://example.com)

### Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 19, 2026 | AI Copilot | Initial test plan created |

---

**End of Document**
