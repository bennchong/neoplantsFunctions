let fs = {
  users: [
    {
      userID: 'RYflwfCmV5RiYwcsqFy2D3isLpz2',
      email: 'ab@a.com',
      userHandle: 'user1',
      createdAt: '2020-10-14T16:31:52.083Z', //ISO string
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/socialfarm-950c6.appspot.com/o/9895245.jpg?alt=media',
      bio: 'Hola World',
      blockNum: '23',
      unitNum: '06-12'
    }
  ],
  posts : [
    {
      userHandle: 'user',
      body: 'this is the body stuff',
      createdAt: 'ISODateString',
      likeCount: 3,
      commentCount: 4
    }
  ],
  comments: [
    {
      userHandle: 'user',
      screamId: 'kdjsfgdksuufhgkdsufky',
      body: 'This is my comment',
      createdAt: '2019-03-15T10:59:52.798Z'
    }
  ],
}

const userDetails = {
  // Redux data
  credentials: {
    userId: 'N43KJ5H43KJHREW4J5H3JWMERHB',
    email: 'user@email.com',
    userHandle: 'user',
    createdAt: '2019-03-15T10:59:52.798Z',
    imageUrl: 'image/dsfsdkfghskdfgs/dgfdhfgdh',
    bio: 'Hello, my name is user, nice to meet you',
    blockNum: '24',
    blockUnit: '06-12'
  },
  likes: [
    {
      userHandle: 'user',
      screamId: 'hh7O5oWfWucVzGbHH2pa'
    },
    {
      userHandle: 'user',
      screamId: '3IOnFoQexRcofs5OhBXO'
    }
  ]
};