<template>
  <div class="home" style="padding: 24px">
    <div style="display: flex; margin-bottom: 16px; align-items: flex-end">
      <div style="flex-grow: 1; display: flex; align-items: flex-end" >
        <img src="../assets/pigeon.jpg" width="200px" height="200px" />
        <span style="padding-bottom: 24px; font-size: 24px">VU咕咕</span>
      </div>
      <div style="padding-bottom: 32px;">
        <a-switch defaultChecked @change="handleOnly10kFollowerUpSwitchChange" style="margin-right: 4px" /> {{ only10kFollowerUp ? '只看万粉P主' : '查看所有P主' }}
        <a-switch defaultChecked @change="handlelastVideoModeSwitchChange" style="margin-left: 12px; margin-right: 4px" /> {{ lastVideoMode === 'participated' ? '包含联合投稿' : '只看本人投稿' }}
        <a-switch defaultChecked @change="handleSortSwitchChange" style="margin-left: 12px; margin-right: 4px" /> {{ desc ? '从大到小排序' : '从小到大排序' }}
      </div>
    </div>
    <a-table :columns="columnsToDisplay" :data-source="upInfoListToDisplay" :pagination="false">
      <template slot="up" slot-scope="upInfo">
        <div style="display: flex">
          <a-avatar :src="httpS(upInfo.face)" :size="48" />
          <div style="margin-left: 12px">
            <div style="display: flex">
              <span @click="go(`https://tdd.bunnyxt.com/member/${upInfo.mid}`)" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1.17em; color: rgba(0, 0, 0, 0.85); font-weight: 500; cursor: pointer;" :title="upInfo.name">
                {{ upInfo.name }}
              </span>
              <span style="margin-left: 8px">
                <template v-if="upInfo.sex === '男'">
                  <span style="font-size: 1.17em; color: #00b5f6; margin-top: 4px">
                    <icon-font type="icon-xingbie-nan" />
                  </span>
                </template>
                <template v-else-if="upInfo.sex === '女'">
                  <span style="font-size: 1.17em; color: #f9a9f8; margin-top: 4px">
                    <icon-font type="icon-xingbie-nv" />
                  </span>
                </template>
                <template v-else-if="upInfo.sex === '保密'">
                  <span style="font-size: 1.17em; color: rgba(183,183,183,0.95); margin-top: 4px">
                    <icon-font type="icon-xingbie-weizhi" />
                  </span>
                </template>
              </span>
            </div>
            <div>
              <a-icon type="video-camera" style="margin-right: 4px" />
              {{ upInfo.video_count.toLocaleString() }}
              <a-icon type="team" style="margin-left: 12px; margin-right: 4px" />
              {{ upInfo.follower.toLocaleString() }}
            </div>
          </div>
        </div>
      </template>
      <template slot="last_video" slot-scope="lastVideo">
        <div style="width: 100%; position: relative">
          <div style="width: 100%; height: 3px; background: #e8e8e8; position: absolute; top: 31px; left: 0" />
          <div style="position: relative; height: 65px; width: calc(100% - 108px)">
            <img :src="httpS(lastVideo.pic)" width="108" height="65" :style="`position: absolute; left: ${100 - (Math.floor(Date.now() / 1000) - lastVideo.pubdate) / (Math.floor(Date.now() / 1000) - farestPubdate) * 100}%; top: 0`" />
          </div>
        </div>
      </template>
      <template slot="time_till_now" slot-scope="lastVideo">
        {{ Math.floor((Math.floor(Date.now() / 1000) - lastVideo.pubdate) / (60 * 60 * 24)) }}天
      </template>
    </a-table>
  </div>
</template>

<script>
import cloudbase from '@cloudbase/js-sdk';
import _ from 'lodash';
import { Icon } from "ant-design-vue";

const IconFont = Icon.createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_1640736_mzfdr5d9c2h.js',
});

export default {
  name: 'Home',
  components: {
    IconFont,
  },
  data() {
    return {
      upInfoList: [],
      lastVideoMode: 'participated',  // uploaded or participated
      desc: true,
      only10kFollowerUp: true,
      columns: [{
        title: 'UP主',
        scopedSlots: { customRender: 'up' },
        key: 'mid',
        width: '180px',
      }, {
        title: '最新视频',
        dataIndex: 'last_video_participated',
        scopedSlots: { customRender: 'last_video' },
        key: 'last_video_participated.aid',
      }, {
        title: '距今已有',
        dataIndex: 'last_video_participated',
        scopedSlots: { customRender: 'time_till_now' },
        key: 'last_video_participated.bvid',
        width: '100px',
      }],
    }
  },
  computed: {
    upInfoListToDisplay() {
      let sortedUpInfoList = [...this.upInfoList];
      if (this.only10kFollowerUp) {
        sortedUpInfoList = sortedUpInfoList.filter(upInfo => upInfo.follower > 10000);
      }
      switch (this.lastVideoMode) {
        case 'participated':
          sortedUpInfoList = sortedUpInfoList.filter(info => info.last_video_participated);
          if (this.desc) {
            sortedUpInfoList.sort((a, b) => a.last_video_participated.pubdate - b.last_video_participated.pubdate);
          } else {
            sortedUpInfoList.sort((a, b) => b.last_video_participated.pubdate - a.last_video_participated.pubdate);
          }
          break;
        case 'uploaded':
        default:
          sortedUpInfoList = sortedUpInfoList.filter(info => info.last_video_uploaded);
          if (this.desc) {
            sortedUpInfoList.sort((a, b) => a.last_video_uploaded.pubdate - b.last_video_uploaded.pubdate);
          } else {
            sortedUpInfoList.sort((a, b) => b.last_video_uploaded.pubdate - a.last_video_uploaded.pubdate);
          }
          break;
      }
      return sortedUpInfoList;
    },
    columnsToDisplay() {
      let modifiedColumns = _.cloneDeep(this.columns);
      switch (this.lastVideoMode) {
        case 'participated':
          modifiedColumns[1].dataIndex = 'last_video_participated';
          modifiedColumns[1].key = 'last_video_participated.aid';
          modifiedColumns[2].dataIndex = 'last_video_participated';
          modifiedColumns[2].key = 'last_video_participated.bvid';
          break;
        case 'uploaded':
        default:
          modifiedColumns[1].dataIndex = 'last_video_uploaded';
          modifiedColumns[1].key = 'last_video_uploaded.aid';
          modifiedColumns[2].dataIndex = 'last_video_uploaded';
          modifiedColumns[2].key = 'last_video_uploaded.bvid';
          break;
      }
      return modifiedColumns;
    },
    farestPubdate() {
      console.log(Math.min(...this.upInfoListToDisplay.map(upInfo => upInfo[`last_video_${this.lastVideoMode}`].pubdate)));
      return Math.min(...this.upInfoListToDisplay.map(upInfo => upInfo[`last_video_${this.lastVideoMode}`].pubdate));
    },
  },
  methods: {
    httpS(url) {
      if (typeof url == 'string') {
        return url.replace(/^http:/, 'https:');
      } else {
        return url;
      }
    },
    go(url) {
      window.open(url);
    },
    handlelastVideoModeSwitchChange(e) {
      if (e) {
        this.lastVideoMode = 'participated';
      } else {
        this.lastVideoMode = 'uploaded';
      }
    },
    handleSortSwitchChange(e) {
      this.desc = e;
    },
    handleOnly10kFollowerUpSwitchChange(e) {
      this.only10kFollowerUp = e;
    }
  },
  created() {
    const app = cloudbase.init({
      env: 'hello-cloudbase-6g00ywzbc34e2bea'
    });
    const auth = app.auth({
      persistence: "local"
    });
    const db = app.database();

    auth
      .anonymousAuthProvider()
      .signIn()
      .then(() => {
        // uid = auth.hasLoginState().user.uid;
        db.collection('up_info')
          .get()
          .then((res) => {
            this.upInfoList = res.data;
          });
      });
  },
}
</script>

<style scoped>

</style>
