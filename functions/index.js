const functions = require('firebase-functions');


const express = require('express');
const app = express();

const { fs } = require('./util/admin');
const FBAuth = require('./util/fbAuth');

const cors = require('cors');
app.use(cors());

const { getAllPosts, postOnePost, getPost, commentOnPost, likePost, unlikePost, deletePost } = require('./handlers/posts')
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser, getUserDetails, markNotificationRead } = require('./handlers/users')

// Post routes
app.get('/posts', getAllPosts);
// Whatever :postId will be, will be passed into getPost as params.postId
app.get(`/post/:postId`, getPost);
app.delete(`/post/:postId/`, FBAuth, deletePost);
app.post('/createPost', FBAuth, postOnePost)
// Like and unlike
app.post(`/post/:postId/like`, FBAuth, likePost);
app.post(`/post/:postId/unlike`, FBAuth, unlikePost);
// TODO: Add a comment
app.post(`/post/:postId/comment`, FBAuth, commentOnPost);

// Additional user information
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)

// User routes
app.post('/signup', signup)
app.post('/login', login)
// User latest
app.get('/user/:userHandle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationRead)

// https://baseurl.com/api/screams DO THE PREFIX 

exports.api = functions.region('asia-southeast2').https.onRequest(app);

exports.createNotificationOnLike = functions.region('asia-southeast2').firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return fs.doc(`/posts/${snapshot.data().postId}`).get()
      .then(doc => {
        //Check if it exits and the person who liked his own post will not get notification
        if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
          return fs.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            postId: doc.id 
          })
        }
      })
      .catch(err => {
        console.error(err);
      })
  });

exports.deleteNotificationOnUnlike = functions.region('asia-southeast2').firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return fs.doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
      })
  })

  // Adds a doc to notification collection when someone comments on users post
exports.createNotificationOnComment = functions.region('asia-southeast2').firestore.document(`comments/{id}`)
  .onCreate((snapshot) => {
    return fs.doc(`/posts/${snapshot.data().postId}`).get()
      .then(doc => {
        if(doc.exists){
          return fs.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            postId: doc.id 
          })
        }
      })
      .catch(err => {
        console.error(err);
      })
  });

// Change all comments and posts when user edit their userImage URL link
exports.onUserImageChange = functions.region('asia-southeast2').firestore.document(`/users/{userID}`)
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    // Check if user has edited their imageUrl
    if(change.before.data().imageUrl !== change.after.data().imageUrl){
      console.log('image has changed');
      // Do batch write
      let batch =  fs.batch();
      // get all posts by users
      return fs.collection('posts').where('userHandle', '==', change.before.data().userHandle).get()
        .then((data) => {
          data.forEach(doc => {
            const post = fs.doc(`/posts/${doc.id}`);
            batch.update(post, {userImage: change.after.data().imageUrl});
          })
          // get all comments by users
          return fs.collection('comments').where('userHandle', '==', change.before.data().userHandle).get()
          .then((data) => {
            data.forEach(doc => {
              const post = fs.doc(`/comments/${doc.id}`);
              batch.update(post, {userImage: change.after.data().imageUrl});
            })
            return batch.commit();
          });
        });
    } else return true;
  });

// Deletes all notification, likes and comments if users delete their original post
exports.onPostDelete = functions.region('asia-southeast2').firestore.document(`/posts/{postId}`).onDelete((snapshot, context) => {
  const postId = context.params.postId;
  let batch = fs.batch();
  return fs.collection('comments').where('postId', '==', postId).get()
    .then(data => {
      data.forEach( doc => {
        batch.delete(fs.doc(`/comments/${doc.id}`));
      })
      return fs.collection('likes').where('postId', '==', postId).get();
    })
    .then(data => {
      data.forEach( doc => {
        batch.delete(fs.doc(`/likes/${doc.id}`));
      })
      return fs.collection('notifications').where('postId', '==', postId).get();
    })
    .then(data => {
      data.forEach( doc => {
        batch.delete(fs.doc(`/notifications/${doc.id}`));
      })
      return batch.commit();
    })
    .catch( err => console.error(err));
})