const { fs } = require('../util/admin');

exports.getAllPosts = (req, res) => {
  fs.collection('posts')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let posts = []
      data.forEach(doc => {
        posts.push({
          postId: doc.id,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          body: doc.data().body,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage,
        })
      })
      return res.json(posts)
    })
    .catch(err => console.error({error: err.code}))
}

// Post a new post
exports.postOnePost = (req, res) => {
  if (req.body.body.trim() === ''){
    return res.status(400).json({ body: 'Body must not be empty'});
  }
  
  const newPost = {
    body: req.body.body,
    userHandle: req.user.userHandle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  }

  fs.collection('posts').add(newPost).then(doc => {
    const responsePost = newPost;
    responsePost.postId = doc.id
    res.json( responsePost)
  }).catch( err => {
    res.status(500).json({ error: `Something went wrong`});
    console.error(err);
  })
}

// Get one single post with its comments
exports.getPost = (req, res) => {
  let postData = {};
  fs.doc(`/posts/${req.params.postId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Post not found'})
      }
      postData = doc.data();
      postData.postId = doc.id;
      // Returns documents/comment from collection/comments where document collection has field postId == to the one we refering to
      return fs.collection('comments').where('postId', '==', req.params.postId).orderBy('createdAt', 'desc').get();
    })
    .then(comments => {
      postData.comments = [];
      comments.forEach(comment => {
        postData.comments.push(comment.data())
      })
      return res.json(postData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    })
}

// Comment on a post
exports.commentOnPost = (req, res) => {
  if(req.body.body.trim() === '') return res.status(400).json({ error: 'Must not be empty in body'});

  
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    postId: req.params.postId,
    userHandle: req.user.userHandle,
    userImage: req.user.imageUrl
  };
  console.log(newComment)

  fs.doc(`/posts/${req.params.postId}`).get()
    .then(post => {
      if(!post.exists){
        return res.status(404).json({ error: "Post not found anymore"})
      }
      return post.ref.update({ commentCount: post.data().commentCount + 1})
    })
    .then(() => {
      return fs.collection('comments').add(newComment);
    })
    .then(() => {
      // Returns it to the user so they can see it update live on their own machine
      res.json({newComment});
    })
    .catch( err => {
      console.log(err);
      res.status(500).json({ error: err.code });
    })
}

// Like a post 
exports.likePost = (req, res) => {
  // Check whether user have already liked post
  // Check whether post even exists
  const likeDocument = fs.collection('likes').where('userHandle', '==', req.user.userHandle)
    .where('postId', '==', req.params.postId).limit(1);
  
  const postDocument = fs.doc(`/posts/${req.params.postId}`);
  
  // To increment the like counts
  let postData = {};

  //First get the post document to like
  postDocument.get()
    .then(doc => {
      if(doc.exists){
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else return res.status(404).json({ error: "Post not found"});
    })
    // Then find whether the user have already liked it
    .then(data => {
      if(data.empty){
        return fs.collection('likes').add({
          postId: req.params.postId,
          userHandle: req.user.userHandle
        })
        .then(() => {
          postData.likeCount++
          return postDocument.update({ likeCount: postData.likeCount});
        })
        .then(() => {
          return res.json(postData)
        }) 
      } else return res.status(400).json({ error: "Post already liked"});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code});
    })
}


// Unlike a post
exports.unlikePost = (req, res) => {
  // Check whether user have already liked post
  // Check whether post even exists
  const likeDocument = fs.collection('likes').where('userHandle', '==', req.user.userHandle)
    .where('postId', '==', req.params.postId).limit(1);
  
  const postDocument = fs.doc(`/posts/${req.params.postId}`);

  // To decrement likes
  let postData = {};

  //First get the post document to like
  postDocument.get()
    .then(doc => {
      if(doc.exists){
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else return res.status(404).json({ error: "Post not found"});
    })
    // Then find whether the user have already liked it
    .then(data => {
      if(data.empty){
        return res.status(400).json({ error: "Post is not liked yet"});
      } else {
        return fs.doc(`/likes/${data.docs[0].id}`).delete()
        .then(() => {
          postData.likeCount--;
          return postDocument.update({ likeCount: postData.likeCount});
        })
        .then(() => {
          res.json(postData)
        })
      }
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code});
    })
}

// Deletes a post
// TODO : DELETE ALL THE CORRESPONDING comments and likes 
exports.deletePost = (req, res) => {
  const document = fs.doc(`/posts/${req.params.postId}`);
  document.get()
    .then( post => {
      if(!post.exists){
        return res.status(404).json({ error: "Post not found"});
      }
      // Check if person requesting is the owner of this post
      if(post.data().userHandle !== req.user.userHandle){
        return res.status(403).json({ error: "You're not authorized to execute this"});
      } else {
        return post.delete();
      }
    })
    .then(() => {
      return res.json({ message: "Post deleted successfully, have a good day"});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code})
    })
}