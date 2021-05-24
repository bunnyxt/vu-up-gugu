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
    if (result === undefined) {
      console.log(`WARNING: cannot find last_video of member mid ${mid}, this should not happen, skip.`);
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

async function getUpVideos(upMidList, conn) {
  const upVideos = {};
  const videoCache = {};
  for (const mid of upMidList) {
    // 获取创作者投稿或参与的视频的mid
    let videoAidList = [];
    let sql = `select aid from tdd_video_staff where mid = ?;`;
    let results = await conn.query(sql, mid);
    for (const r of results) {
      videoAidList.push(r.aid);
    }
    sql = `select aid from tdd_video where mid = ?;`;
    results = await conn.query(sql, mid);
    for (const r of results) {
      videoAidList.push(r.aid);
    }
    videoAidList = [...new Set(videoAidList)];
    // 获取这些视频的详细信息
    const videoList = [];
    for (const aid of videoAidList) {
      if (videoCache[aid] === undefined) {
        sql = `
          select v.aid, bvid, videos, tid, tname, pic, title, pubdate, \`desc\`, tags, 
            m.mid, sex, name, face, sign,
            r.added as record_added, \`view\`, danmaku, reply, favorite, coin, share, \`like\`
          from tdd_video v 
            left join tdd_member m on v.mid = m.mid 
            left join tdd_video_record r on v.laststat = r.id 
          where v.aid = ?;`;
          let result = await conn.query(sql, aid);
          result = result[0];
          if (result === undefined) {
            console.log(`WARNING: cannot find video aid ${aid}, this should not happen, skip.`);
            continue;
          }
          videoCache[aid] = {
            aid: result.aid,
            bvid: result.bvid,
            videos: result.videos,
            tid: result.tid,
            tname: result.tname,
            pic: result.pic,
            title: result.title,
            pubdate: result.pubdate,
            desc: result.desc,
            tags: result.tags,
            up: {
              mid: result.mid,
              sex: result.sex,
              name: result.name,
              face: result.face,
              sign: result.sign,
            },
            last_record: {
              added: result.record_added,
              view: result.view,
              danmaku: result.danmaku,
              reply: result.reply,
              favorite: result.favorite,
              coin: result.coin,
              share: result.share,
              like: result.like,
            },
          };
      }
      videoList.push(videoCache[aid]);
    }
    videoList.sort((a, b) => b.pubdate - a.pubdate);  // 按投稿时间从新到旧排序
    upVideos[mid] = videoList;
  }
  return upVideos;
}

exports.main = async function () {
  const conn = await getDbConn();

  // 步骤1: 获取满足条件的视频的创作者们
  const upMidList = await getUpMidList(conn);

  // 步骤2: 获取这些创作者们的个人信息
  const upInfoList = await getUpInfoList(upMidList, conn);

  // 步骤3: 获取创作者们的视频列表
  const upVideos = await getUpVideos(upMidList, conn);

  conn.end();

  return upVideos;
};
