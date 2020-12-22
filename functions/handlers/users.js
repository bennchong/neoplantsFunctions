const { fs, admin } = require('../util/admin')

const config = require('../util/config');

const firebase = require('firebase');
firebase.initializeApp(config)

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');
const { user } = require('firebase-functions/lib/providers/auth');

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userHandle: req.body.userHandle,
    fullName: req.body.fullName,
    nric: req.body.nric,
    blockNum: req.body.blockNum,
    floorNum: req.body.floorNum,
    unitNum: req.body.unitNum,
    vegChoice: req.body.vegChoice
  };
  
  const { valid, errors } = validateSignupData(newUser);
  if(!valid) return res.status(400).json(errors);
  
  const noImg = 'no-img.png';

  let token, userId; 
  fs.doc(`/users/${newUser.userHandle}`).get()
   .then(doc => {
     if(doc.exists){
       res.status(400).json({ userHandle: 'This userHandle is already taken'})
     } else {
       return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
     }
   })
   .then(data => {
     userId = data.user.uid;
     return data.user.getIdToken();
   })
   .then(idToken => {
     token = idToken;
     const userCredentials = {
       userHandle: newUser.userHandle,
       email: newUser.email,
       createdAt: new Date().toISOString(),
       imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
       userId
     }
     return fs.doc(`/users/${newUser.userHandle}`).set(userCredentials);
   })
   .then(() => {
     return res.status(201).json({ token })
   })
   .catch( err => {
     console.error(err);
     if(err.code === 'auth/email-already-in-use'){
       return res.status(400).json({ email: 'Email is already in use' });
     }
     return res.status(500).json({ general: "Something went wrong, please try again" })
   })
 }

 exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  }

  const { valid, errors } = validateLoginData(user);
  if(!valid) return res.status(400).json(errors);

  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({token});
    })
    .catch(err => {
      console.error(err);
      // auth/wrong-password
      // auth/user-not-found
      if(err.code === 'auth/wrong-password'){
        return res.status(403).json({ general: 'Wrong credentials, please try again'});
      }
      return res.status(500).json({ error: err.code})
    })
}

// Update/add user details
exports.addUserDetails = (req, res) => {
  // Returns only entered userDetails, eg. block num, unit num and bio
  // TODO ensure certain fields are required
  let userDetails = reduceUserDetails(req.body);
  fs.doc(`/users/${req.user.userHandle}`).update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successfully"});
    })
    .catch(() => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    })
}

// Get user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  fs.doc(`/users/${req.user.userHandle}`).get()
    .then( doc => {
      if(doc.exists){
        userData.credentials = doc.data();
        return fs.collection('likes').where('userHandle', '==', req.user.userHandle).get();
      }
    })
    .then(likes => {
      userData.likes = [];
      likes.forEach(like => {
        userData.likes.push(like.data());
      })
      return fs.collection('notifications').where('recipient', '==', req.user.userHandle)
        .orderBy('createdAt', 'desc').limit(10).get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          postId: doc.data().postId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id
        })
      });
      return res.json(userData)
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    })
}

// Using busboy to handle uploading
// TODO Check previous image uploaded, and delete previous file if it exists 
exports.uploadImage = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const filesystem = require('fs')

  const busboy = new BusBoy({ headers: req.headers });
  
  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname);
    console.log(filename);
    console.log(mimetype);
    // Guards
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
      return res.status(400).json({ error: "Wrong file type submitted"})
    }
    // Image.png 
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    imageFileName = `${Math.round(Math.random()*9999999)}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    // Library to create the file
    file.pipe(filesystem.createWriteStream(filepath));
  });
  busboy.on('finish', () => {
    admin.storage().bucket().upload(imageToBeUploaded.filepath, {
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageToBeUploaded.mimetype
        }
      }
    })
    .then(() => {
      // Altmedia shows in on the broswer instead of downloading it
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
      return fs.doc(`/users/${req.user.userHandle}`).update({ imageUrl });
    })
    .then(() => {
      return res.json({ message: "Image uploaded successfully"});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    })
  })
  busboy.end(req.rawBody)
}

// Get any user's details
exports.getUserDetails = (req, res) => {
  let userData = {};
  fs.doc(`/users/${req.params.userHandle}`).get()
    .then(doc => {
      if(doc.exists){
        userData.user = doc.data();
        fs.collection('posts').where('userHandle', '==', req.params.userHandle)
          .orderBy('createdAt', 'desc')
          .get()
          .then(data => {
            userData.posts = [];
            data.forEach(doc => {
              userData.posts.push({
                body: doc.data().body,
                createdAt: doc.data().createdAt,
                userHandle: doc.data().userHandle,
                userImage: doc.data().userImage,
                likeCount: doc.data().likeCount,
                commentCount: doc.data().commentCount,
                postId: doc.id
              })
            });
            return res.json(userData);
          })
      } else {
        return res.status(404).json({ error: "User not found"});
      }
    })
    .catch( err => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    })
}

// When users have seen notifications
exports.markNotificationRead = (req, res) => {
  let batch = fs.batch();
  req.body.forEach(notificationId => {
    const notification = fs.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  })
  batch.commit()
    .then(() => {
      return res.json({ message: "Notifications marked read"});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    })
}