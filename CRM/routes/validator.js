const { body, validationResult } = require('express-validator')

// addClient Form Validation
const newClientValidator = () => {
  return [
    // clientName must not be empty and
    body('clientName').not().isEmpty().withMessage('must not be empty')
    .trim(),
    // agentAbbrev must not be empty
    body('agentAbbrev').not().isEmpty().withMessage('must select an agent'),
    // clientPhone must be numeric
    body('clientPhone').optional().isNumeric().withMessage('must be a valid number'),
    // clientFax must be numeric
    body('clientFax').optional().isNumeric().withMessage('must be a valid number'),
    // clientEmail1 must be a valid email
    body('clientEmail1').optional().isEmail().withMessage('must be a email address'),
    // clientEmail2 must be a valid email
    body('clientEmail2').optional().isEmail().withMessage('must be a email address'),
  ]
}

// addContact Form Validation
const newContactValidator = () => {
  return [
    // clientID must not be empty
    body('clientID').not().isEmpty().withMessage('must not be empty'),
    // contactFirstName must not be empty
    body('contactFirstName').not().isEmpty().withMessage('must enter a first name'),
    // contactPosition must not be empty
    body('contactPosition').not().isEmpty().withMessage('must have position'),
    // contactPhone must be numeric
    body('contactPhone').optional().isNumeric().withMessage('must be a valid number'),
    // clientMobile must be numeric
    body('contactMobile').optional().isNumeric().withMessage('must be a valid number'),
    // contactEmail must be a valid email
    body('contactEmail').optional().isEmail().withMessage('must be a email address'),
  ]
}

// addEvent Form Validation
const newEventValidator = () => {
  return [
    // eventDate must not be empty and a valid date
    body('eventDate').not().isEmpty().isDate().withMessage('must be a valid date'),
    // agentID must not be empty
    body('agentID').not().isEmpty().withMessage('must select an agent'),
    // clientID must not be empty
    body('clientID').not().isEmpty().withMessage('must not be empty'),
    // eventType must not be empty
    body('eventType').not().isEmpty().withMessage('must select event type'),
  ]
}

// addUser Form Validation
const newUserValidator = () => {
  return [
    // username must be at least 5 chars long
    body('newUserName').isLength({ min: 5 }).withMessage('must be at least 5 chars long'),
    // user type must not be empty
    body('newUserType').not().isEmpty().withMessage('must select a user type'),
    // agentAbbrev must be capital letters
    body('agentAbbrev').isUppercase().withMessage('must be capitalized'),
    // password must be at least 6 chars long and contain a number
    body('newPassword').isLength({ min: 6 }).withMessage('must be at least 6 chars long')
    .matches('[0-9]').withMessage('Password Must Contain a Number'),
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
