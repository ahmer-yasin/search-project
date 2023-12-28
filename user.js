const db = require('./database');

const init = async () => {
  await db.run('CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name varchar(32));');
  await db.run('CREATE TABLE Friends (id INTEGER PRIMARY KEY AUTOINCREMENT, userId int, friendId int);');
  const users = [];
  const names = ['foo', 'bar', 'baz'];
  for (i = 0; i < 27000; ++i) {
    let n = i;
    let name = '';
    for (j = 0; j < 3; ++j) {
      name += names[n % 3];
      n = Math.floor(n / 3);
      name += n % 10;
      n = Math.floor(n / 10);
    }
    users.push(name);
  }
  const friends = users.map(() => []);
  for (i = 0; i < friends.length; ++i) {
    const n = 10 + Math.floor(90 * Math.random());
    const list = [...Array(n)].map(() => Math.floor(friends.length * Math.random()));
    list.forEach((j) => {
      if (i === j) {
        return;
      }
      if (friends[i].indexOf(j) >= 0 || friends[j].indexOf(i) >= 0) {
        return;
      }
      friends[i].push(j);
      friends[j].push(i);
    });
  }
  console.log("Init Users Table...");
  await Promise.all(users.map((un) => db.run(`INSERT INTO Users (name) VALUES ('${un}');`)));
  console.log("Init Friends Table...");
  await Promise.all(friends.map((list, i) => {
    return Promise.all(list.map((j) => db.run(`INSERT INTO Friends (userId, friendId) VALUES (${i + 1}, ${j + 1});`)));
  }));
  console.log("Ready.");
}
module.exports.init = init;
// user.js

const search = async (req, res) => {
  const query = req.params.query;
  const userId = parseInt(req.params.userId);
  try {
    const results = await db.all(`
    SELECT id, name,
    CASE
      WHEN id IN (SELECT friendId FROM Friends WHERE userId = ${userId}) THEN 1
      WHEN id IN (
        SELECT friendId
        FROM Friends
        WHERE userId IN (
          SELECT friendId
          FROM Friends
          WHERE userId IN (SELECT friendId FROM Friends WHERE userId = ${userId})
        )
      ) THEN 2
      WHEN id IN (
        SELECT friendId
        FROM Friends
        WHERE userId IN (
          SELECT friendId
          FROM Friends
          WHERE userId IN (
            SELECT friendId
            FROM Friends
            WHERE userId IN (SELECT friendId FROM Friends WHERE userId = ${userId})
          )
        )
      ) THEN 3
      ELSE 0
    END AS connection
    FROM Users
    WHERE name LIKE '${query}%'
    LIMIT 20;
    `);
    res.statusCode = 200;
    res.json({
      success: true,
      users: results
    });
  } catch (err) {
    res.statusCode = 500;
    res.json({ success: false, error: err });
  }
}
module.exports.search = search;



// user.js

const addFriend = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const friendId = parseInt(req.params.friendId);

  try {
    await db.run(`INSERT INTO Friends (userId, friendId) VALUES (${userId}, ${friendId});`);
    res.statusCode = 200;
    res.json({ success: true });
  } catch (err) {
    res.statusCode = 500;
    res.json({ success: false, error: err });
  }
}
module.exports.addFriend = addFriend;

const removeFriend = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const friendId = parseInt(req.params.friendId);

  try {
    await db.run(`DELETE FROM Friends WHERE (userId = ${userId} AND friendId = ${friendId}) OR (userId = ${friendId} AND friendId = ${userId});`);
    res.statusCode = 200;
    res.json({ success: true });
  } catch (err) {
    res.statusCode = 500;
    res.json({ success: false, error: err });
  }
}
module.exports.removeFriend = removeFriend;