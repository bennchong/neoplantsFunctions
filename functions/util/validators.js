const isEmpty = (string) => {
  if(typeof string === 'undefined') return true;
  if(string.trim() === '') return true;
  else return false 
}

const isEmail = (email) => {
  const regEx = /^[ST]\d{7}[A-Z]$/;
  if(email.match(regEx)) return true;
  else return false;
}

const isNric = (nric) => {
  const regEx = /^[STFG]\d{7}[A-Z]$/
  if(nric.match(regEx)) return true;
  else return false;
}


exports.validateSignupData = (newUser) => {
  let errors = {};

  // if(isEmpty(newUser.fullName)) {
  //   errors.fullName = 'Please enter your full name'
  // }

  // if(isEmpty(newUser.nric)) {
  //   errors.nric = 'Please enter your NRIC'
  // }else if(!isNric(newUser.nric)) {
  //   errors.nric = 'Please enter your valid NRIC'
  // } 

  // if(isEmpty(newUser.blockNum)) {
  //   errors.blockNum = 'Please enter your block number'
  // }
  // if(isEmpty(newUser.floorNum)) {
  //   errors.floorNum = 'Please enter your floor number'
  // }
  // if(isEmpty(newUser.unitNum)) {
  //   errors.unitNum = 'Please enter your unit number'
  // }

   if(isEmpty(newUser.email)) {
     errors.email = 'Must not be empty';
   }else if(!isEmail(newUser.email)) {
     errors.email = 'Must be a valid email address';
   }
 
   if(isEmpty(newUser.password)) errors.password = 'Must not be empty';
   if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match'
   if(isEmpty(newUser.userHandle)) errors.userHandle = 'Must not be empety';
   
   return {
     errors,
     valid: Object.keys(errors).length === 0 ? true: false 
   }
}

exports.validateLoginData = (user) => {
  let errors = {}

  if(isEmpty(user.email)) errors.email = 'Must not be empty';
  if(isEmpty(user.password)) errors.password = 'Must not be empty';

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true: false 
  }
}

// For User Details 
exports.reduceUserDetails = (data) => {
  let userDetails = {};

  if(!isEmpty(data.bio)) userDetails.bio = data.bio;
  if(!isEmpty(data.blockNum)) userDetails.blockNum = data.blockNum;
  if(!isEmpty(data.unitNum)) userDetails.unitNum = data.unitNum;

  return userDetails;
}