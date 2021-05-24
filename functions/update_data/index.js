const mysql = require('promise-mysql');

const getDbConn = async () => {
  return await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB
  })
}

async function getUpMidList(conn) {
  let sql = `
    select v.aid, mid, hasstaff
    from tdd_video v left join tdd_video_record r on v.laststat = r.id 
    where v.code = 0 && v.state = 0 && r.view > 1000000;`;
  let results = await conn.query(sql);

  let upMidList = [];
  const hasStaffVideoAids = [];
  for (const r of results) {
    if (r.hassstaff === 0) {
      upMidList.push(r.mid);
    } else {
      hasStaffVideoAids.push(r.aid);
    }
  }

  for (const aid of hasStaffVideoAids) {
    sql = 'select mid from tdd_video_staff where aid = ?;';
    results = await conn.query(sql, aid);
    for (const r of results) {
      upMidList.push(r.mid);
    }
  }

  return [...new Set(upMidList)];
}

async function getUpInfoList(upMidList, conn) {
  const upInfoList = [];
  for (const mid of upMidList) {
    let sql = `
      select m.mid, sex, name, face, sign, video_count,
        fr.added as follower_added, fr.follower
      from tdd_member m left join tdd_member_follower_record fr on m.last_follower = fr.id
      where m.mid = ?;`;
    let result = await conn.query(sql, mid);
    result = result[0];
    if (result.aid === null) {
      console.log(`WARNING: mid ${mid} last_video is NULL, this should not happen, skip.`);
      continue;
    }
    upInfoList.push({
      mid,
      sex: result.sex,
      name: result.name,
      face: result.face,
      sign: result.sign,
      video_count: result.video_count,
      follower: result.follower,
      follower_added: result.follower_added,
    });
    // const videoStaffCache = {};
    // if (result.hasstaff === 0) {
    //   data.last_video.staff = null;
    // } else {
    //   if (!videoStaffCache[data.last_video.aid]) {
    //     const sql = `
    //       select s.mid, s.title, m.name, m.face, m.sex, m.sign 
    //       from tdd_video_staff s left join tdd_member m on s.mid = m.mid 
    //       where aid = ?;`
    //     const staffResults = await conn.query(sql, data.last_video.aid);
    //     const staff = [];
    //     for (const r of staffResults) {
    //       staff.push({
    //         mid: r.mid,
    //         title: r.title,
    //         name: r.name, 
    //         face: r.face,
    //         sex: r.sex,
    //         sign: r.sign,
    //       });
    //     }
    //     videoStaffCache[data.last_video.aid] = staff;
    //   }
    //   data.last_video.staff = videoStaffCache[data.last_video.aid];
    // }
  }

  return upInfoList;
}

exports.main = async function () {
  const conn = await getDbConn();

  // 步骤1: 获取满足条件的视频的创作者们
  const upMidList = await getUpMidList(conn);

  // 步骤2: 获取这些创作者们的个人信息
  const upInfoList = await getUpInfoList(upMidList, conn);

  conn.end();

  return upInfoList;
};
