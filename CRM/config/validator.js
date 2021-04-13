const { body, validationResult } = require('express-validator')

// addClient Form Validation
const newClientValidator = () => {
  return [
    // clientName must not be empty and sanitization
    body('clientName').not().isEmpty().withMessage('must not be empty')
    .trim().escape(),
    // agentAbbrev must not be empty
    body('agentAbbrev').not().isEmpty().withMessage('must select an agent'),
    // clientPhone must be numeric
    body('clientPhone').isNumeric().withMessage('must be a valid number').optional({nullable: true, checkFalsy: true}),
    // clientFax must be numeric
    body('clientFax').isNumeric().withMessage('must be a valid number').optional({nullable: true, checkFalsy: true}),
    // clientAddress1 sanitization
    body('clientAddress1').escape(),
    // clientAddress2 sanitization
    body('clientAddress2').optional({nullable: true, checkFalsy: true}).escape(),
    // clientAddress3 sanitization
    body('clientAddress3').optional({nullable: true, checkFalsy: true}).escape(),
    // clientAddress4 sanitization
    body('clientAddress4').optional({nullable: true, checkFalsy: true}).escape(),
    // clientEmail1 must be a valid email
    body('clientEmail1').isEmail().withMessage('must be a email address').optional({nullable: true, checkFalsy: true}),
    // clientEmail2 must be a valid email
    body('clientEmail2').isEmail().withMessage('must be a email address').optional({nullable: true, checkFalsy: true}),
    // clientNotes sanitization
    body('clientNotes').escape(),
  ]
}

// addContact Form Validation
const newContactValidator = () => {
  return [
    // clientID must not be empty
    body('clientID').not().isEmpty().withMessage('must not be empty'),
    // contactFirstName must not be empty
    body('contactFirstName').not().isEmpty().withMessage('must enter a first name').escape(),
    // contactLastName must not be empty
    body('contactLastName').optional({nullable: true, checkFalsy: true}).escape(),
    // contactPosition must not be empty
    body('contactPosition').not().isEmpty().withMessage('must have position').escape(),
    // contactPhone must be numeric
    body('contactPhone').isNumeric().withMessage('must be a valid number').optional({nullable: true, checkFalsy: true}),
    // clientMobile must be numeric
    body('contactMobile').isNumeric().withMessage('must be a valid number').optional({nullable: true, checkFalsy: true}),
    // contactEmail must be a valid email
    body('contactEmail').isEmail().withMessage('must be a email address').optional({nullable: true, checkFalsy: true}),
    // contactNotes sanitization
    body('contactNotes').escape(),
  ]
}

// addEvent Form Validation
const newEventValidator = () => {
  return [
    // eventDate must not be empty and a valid date
    body('eventDate').not().isEmpty().isDate().withMessage('must be a valid date'),
    // agentID must not be empty
    body('agentID').not().isEmpty().withMessage('must select an agent'),
    // eventTimeIn must not be empty
    body('eventTimeIn').not().isEmpty().withMessage('must not be empty'),
    // eventTimeOut must not be empty
    body('eventTimeOut').not().isEmpty().withMessage('must not be empty'),
    // clientID must not be empty
    body('clientID').not().isEmpty().withMessage('must not be empty'),
    // eventType must not be empty
    body('eventType').not().isEmpty().withMessage('must select event type'),
    // contactID1 must not be empty
    body('contactID1').not().isEmpty().withMessage('must not be empty'),
    // contactID2 optional
    body('contactID2').optional({nullable: true, checkFalsy: true}),
    // eventBranch sanitization
    body('eventBranch').optional({nullable: true, checkFalsy: true}).escape(),
    // eventRemarks must not be empty & sanitization
    body('eventRemarks').not().isEmpty().withMessage('must not be empty').escape(),
  ]
}

// addUser Form Validation
const newUserValidator = () => {
  return [
    // username must be at least 5 chars long
    body('newUserName').isLength({ min: 5 }).withMessage('must be at least 5 chars long').escape(),
    // user type must not be empty
    body('newUserType').not().isEmpty().withMessage('must select a user type'),
    // agentAbbrev must be capital letters
    body('agentAbbrev').isUppercase().withMessage('must be capitalized').escape(),
    // agentFirstName type must not be empty
    body('agentFirstName').not().isEmpty().withMessage('must enter first name').escape(),
    // agentLastName type must not be empty
    body('agentLastName').not().isEmpty().withMessage('must enter last name').escape(),
    // password must be at least 6 chars long and contain a number
    body('newPassword').isLength({ min: 6 }).withMessage('must be at least 6 chars long')
    .matches('[0-9]').withMessage('Password Must Contain a Number'),
    // agentPosition must not be empty
    body('agentPosition').not().isEmpty().withMessage('must not be empty'),
  ]
}

// changePW Form Validation
const changePasswordValidator = () => {
  return [
    // new password must be at least 6 chars long and contain a number
    body('newPassword').isLength({ min: 6 }).withMessage('must be at least 6 chars long')
    .matches('[0-9]').withMessage('Password Must Contain a Number'),
  ]
}

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }
  const extractedErrors = []
  errors.array().map(err => extractedErrors.push({[err.param]: err.msg}))

  return res.status(422).json({
    errors: extractedErrors,
  })
}

module.exports = {
  newClientValidator,
  newContactValidator,
  newEventValidator,
  newUserValidator,
  changePasswordValidator,
  validate,
}
