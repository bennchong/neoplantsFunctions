const { admin, fs } = require('./admin')

module.exports = (req, res, next) => {
  let idToken;
  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('No token found');
    return res.status(403).json({ error: 'Unauthorized'});
  }

  //Gets user handle 
  admin.auth().verifyIdToken(idToken)
    .then( decodedToken => {
      req.user = decodedToken;
      return fs.collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
    })
    .then( data => {
      // Specify what fields to pass to the request calling this authenticated middleware
      req.user.userHandle = data.docs[0].data().userHandle;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      return next();
    })
    .catch(err => {
      console.error('Error while verifying token', err);
      return res.status(403).json(err)
    })
}