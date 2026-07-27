# Login Scenarios

## Application Overview

Login scenarios for Eseye QAN Portal covering successful authentication and common negative login validations.

## Test Scenarios

### 1. Login

**Seed:** `tests/seed.spec.js`

#### 1.1. Successful login with valid credentials

**File:** `tests/login/login-positive.spec.js`

**Steps:**
  1. Open the login page at https://portal.qan.aws.eseye.io/login
    - expect: The login form is displayed with the username field and Continue button.
  2. Enter the username resellerqa and click Continue
    - expect: The password step is displayed.
  3. Enter the password Password#1 and click Continue
    - expect: The user is authenticated and redirected to the dashboard.

#### 1.2. Login fails with invalid credentials

**File:** `tests/login/login-negative.spec.js`

**Steps:**
  1. Open the login page at https://portal.qan.aws.eseye.io/login
    - expect: The login form is displayed.
  2. Enter an invalid username and password, then click Continue
    - expect: An error alert appears with the message Incorrect username or password.
  3. Verify the current page remains on the login screen
    - expect: The URL remains on /login and the user is not authenticated.
