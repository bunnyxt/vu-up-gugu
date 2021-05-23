const mysql = require('promise-mysql');

const getDbConn = async () => {
  return await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB
  })
}

async function getMids(conn) {
  let sql = `
    select v.aid, mid, hasstaff
    from tdd_video v left join tdd_video_record r on v.laststat = r.id 
    where v.code = 0 && v.state = 0 && r.view > 1000000;`;
  let results = await conn.query(sql);

  let mids = [];
  const hasStaffVideoAids = [];
  for (const r of results) {
    if (r.hassstaff === 0) {
      mids.push(r.mid);
    } else {
      hasStaffVideoAids.push(r.aid);
    }
  }

  for (const aid of hasStaffVideoAids) {
    sql = 'select mid from tdd_video_staff where aid = ?;';
    results = await conn.query(sql, aid);
    for (const r of results) {
      mids.push(r.mid);
    }
  }

  mids = [...new Set(mids)];

  return mids;
}

async function getUpData(mids, conn) {
  const upData = [];
  const videoStaffCache = {};
  for (const mid of mids) {
    let sql = `
      select m.mid, sex, name, face, sign, video_count, 
        aid, bvid, videos, pic, title, pubdate, \`desc\`, tags, hasstaff
      from tdd_member m left join tdd_video v on m.last_video = v.id 
      where m.mid = ?;`;
    let result = await conn.query(sql, mid);
    result = result[0];
    if (result.aid === null) {
      console.log(`WARNING: mid ${mid} last_video is NULL, this should not happen, skip.`);
      continue;
    }
    const data = {
      mid,
      sex: result.sex,
      name: result.name,
      face: result.face,
      sign: result.sign,
      video_count: result.video_count,
      last_video: {
        aid: result.aid,
        bvid: result.bvid,
        videos: result.videos,
        pic: result.pic,
        title: result.title,
        pubdate: result.pubdate,
        desc: result.desc,
        tags: result.tags,
      },
    };
    if (result.hasstaff === 0) {
      data.last_video.staff = null;
    } else {
      if (!videoStaffCache[data.last_video.aid]) {
        const sql = `
          select s.mid, s.title, m.name, m.face, m.sex, m.sign 
          from tdd_video_staff s left join tdd_member m on s.mid = m.mid 
          where aid = ?;`
        const staffResults = await conn.query(sql, data.last_video.aid);
        const staff = [];
        for (const r of staffResults) {
          staff.push({
            mid: r.mid,
            title: r.title,
            name: r.name, 
            face: r.face,
            sex: r.sex,
            sign: r.sign,
          });
        }
        videoStaffCache[data.last_video.aid] = staff;
      }
      data.last_video.staff = videoStaffCache[data.last_video.aid];
    }
    upData.push(data);
  }

  upData.sort((a, b) => a.last_video.pubdate - b.last_video.pubdate);

  return upData;
}

exports.main = async function () {
  const conn = await getDbConn();

  // 步骤1: 获取满足条件的视频的创作者们
  const mids = await getMids(conn);

  // 步骤2: 获取这些创作者们的个人信息和视频数据
  const upData = await getUpData(mids, conn);

  conn.end();

  return upData;
};
