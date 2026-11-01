/*
=========================================================
DRIVER LICENSE DATA
---------------------------------------------------------
This file contains temporary driver's license data used
during application development and testing.

DATABASE INTEGRATION NOTE:
Replace this hardcoded data with information retrieved
from the Department of Transport database after the user
has successfully logged into the application.

The Digital License, QR Code, and License Verification
screens all retrieve their information from this file.
=========================================================
*/

export const driverLicense = {

  /*
  -------------------------------------------------------
  PERSONAL INFORMATION

  Future Enhancement:
  Retrieve the driver's personal information from the
  authenticated user's database record.
  -------------------------------------------------------
  */
  fullName: "John Doe",
  initials: "J.D.",
  gender: "Male",
  birthDate: "15 June 1998",
  documentNumber: "9806155123087",

  /*
  -------------------------------------------------------
  DRIVER'S LICENSE INFORMATION

  Future Enhancement:
  Retrieve the driver's license details from the
  Department of Transport database.

  The expiry date will be used by the License
  Verification screen to automatically determine
  whether the license is still valid.
  -------------------------------------------------------
  */
  licenseNumber: "DL-784-992-PTA",
  licenseCategory: "Code B",
  issueDate: "12 March 2025",
  expiryDate: "12 March 2030",
  status: "Valid",
};