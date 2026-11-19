/* ==========================================================================
   i18n — every user-facing string is provided in Korean and Chinese.
   모든 화면 문구는 한국어와 중국어를 함께 표시합니다. / 所有界面文案同时显示韩语和中文。
   ========================================================================== */
(function (global) {
  "use strict";

  var DICT = {
    tagline: {
      ko: "브라우저에서 바로 두드리는 16스텝 비트 메이커",
      zh: "在浏览器里即刻敲打的 16 步节拍制作器"
    },
    play: { ko: "재생", zh: "播放" },
    stop: { ko: "정지", zh: "停止" },
    tempo: { ko: "템포 · BPM", zh: "速度 · BPM" },
    swing: { ko: "스윙", zh: "摇摆" },
    volume: { ko: "마스터 볼륨", zh: "主音量" },
    tone: { ko: "신스 음색", zh: "合成音色" },
    preset: { ko: "프리셋", zh: "预设" },
    randomize: { ko: "랜덤 비트", zh: "随机节拍" },
    clear: { ko: "전체 지우기", zh: "全部清除" },
    sequencer: { ko: "16스텝 시퀀서", zh: "16 步音序器" },
    seqHint: { ko: "칸을 눌러 비트를 켜고 끄세요", zh: "点击格子打开或关闭节拍" },
    trackCol: { ko: "트랙", zh: "音轨" },
    myPatterns: { ko: "내 패턴", zh: "我的图案" },
    patternNamePh: { ko: "패턴 이름", zh: "图案名称" },
    save: { ko: "저장", zh: "保存" },
    noPatterns: { ko: "저장된 패턴이 없습니다", zh: "还没有保存的图案" },
    export: { ko: "내보내기", zh: "导出" },
    import: { ko: "가져오기", zh: "导入" },
    shortcuts: { ko: "단축키", zh: "快捷键" },
    scPlay: { ko: "재생 · 정지", zh: "播放 · 停止" },
    scRandom: { ko: "랜덤 비트 만들기", zh: "生成随机节拍" },
    scClear: { ko: "모든 스텝 지우기", zh: "清除所有步进" },
    about: { ko: "소개", zh: "简介" },
    aboutText: {
      ko: "바이브 비트 스튜디오는 설치 없이 브라우저에서 16스텝 비트를 만드는 웹 앱입니다. 소리는 Web Audio API로 실시간 합성되며, 패턴은 이 브라우저에 자동 저장됩니다.",
      zh: "节拍工坊是一款无需安装、直接在浏览器中制作 16 步节拍的网页应用。声音由 Web Audio API 实时合成，图案会自动保存在本浏览器中。"
    },
    footerNote: {
      ko: "VIVE Coding 과제 · AI와 함께 기획·제작·검증한 프로젝트입니다.",
      zh: "VIVE Coding 作业 · 本项目由 AI 协助策划、制作与验证。"
    },
    github: { ko: "GitHub 저장소", zh: "GitHub 仓库" },
    audioHint: {
      ko: "재생 버튼을 누르면 소리가 켜집니다.",
      zh: "点击播放按钮即可开启声音。"
    },
    ariaGrid: { ko: "16스텝 시퀀서 그리드", zh: "16 步音序器网格" },
    presetEmpty: { ko: "빈 패턴", zh: "空白图案" },
    presetBoomBap: { ko: "붐뱁", zh: "老派嘻哈" },
    presetHouse: { ko: "하우스", zh: "浩室" },
    presetTrap: { ko: "트랩", zh: "陷阱音乐" },
    presetKpop: { ko: "케이팝", zh: "韩流流行" },
    tonePluck: { ko: "플럭", zh: "拨弦" },
    toneLead: { ko: "리드", zh: "主音" },
    toneBass: { ko: "베이스", zh: "低音" },
    toastSaved: { ko: "패턴을 저장했습니다: {name}", zh: "图案已保存：{name}" },
    toastLoaded: { ko: "패턴을 불러왔습니다: {name}", zh: "已载入图案：{name}" },
    toastDeleted: { ko: "패턴을 삭제했습니다: {name}", zh: "已删除图案：{name}" },
    toastCleared: { ko: "모든 스텝을 지웠습니다", zh: "已清除所有步进" },
    toastRandomized: { ko: "새로운 랜덤 비트가 만들어졌습니다", zh: "已生成新的随机节拍" },
    toastPreset: { ko: "프리셋을 적용했습니다: {name}", zh: "已应用预设：{name}" },
    toastExported: { ko: "패턴을 JSON 파일로 내보냈습니다", zh: "已将图案导出为 JSON 文件" },
    toastImported: { ko: "패턴을 가져왔습니다", zh: "已导入图案" },
    toastImportError: {
      ko: "가져올 수 없는 파일입니다. 형식을 확인해 주세요.",
      zh: "无法导入该文件，请检查格式。"
    },
    toastNameRequired: { ko: "패턴 이름을 입력해 주세요", zh: "请先输入图案名称" },
    toastLimit: { ko: "패턴은 최대 20개까지 저장됩니다", zh: "最多可保存 20 个图案" },
    toastAudioError: {
      ko: "오디오를 시작할 수 없습니다. 브라우저를 확인해 주세요.",
      zh: "无法启动音频，请检查浏览器。"
    },
    confirmDelete: { ko: "이 패턴을 삭제할까요?", zh: "要删除这个图案吗？" },
    confirmClear: { ko: "모든 스텝을 지울까요?", zh: "要清除所有步进吗？" },
    stepOn: { ko: "켜짐", zh: "开启" },
    stepOff: { ko: "꺼짐", zh: "关闭" },
    mute: { ko: "음소거", zh: "静音" },
    unmute: { ko: "음소거 해제", zh: "取消静音" },
    preview: { ko: "미리 듣기", zh: "试听" },
    load: { ko: "불러오기", zh: "载入" },
    delete: { ko: "삭제", zh: "删除" }
  };

  var SEP = '<i class="sep">/</i>';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fill(text, vars) {
    if (!vars) return text;
    return String(text).replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m;
    });
  }

  var i18n = {
    dict: DICT,
    has: function (key) {
      return Object.prototype.hasOwnProperty.call(DICT, key);
    },
    /** Plain "한국어 / 中文" string, safe for aria-label, toast, confirm(). */
    t: function (key, vars) {
      var entry = DICT[key];
      if (!entry) return key;
      return fill(entry.ko, vars) + " / " + fill(entry.zh, vars);
    },
    ko: function (key, vars) {
      var entry = DICT[key];
      if (!entry) return key;
      return fill(entry.ko, vars);
    },
    zh: function (key, vars) {
      var entry = DICT[key];
      if (!entry) return key;
      return fill(entry.zh, vars);
    },
    /** Markup with the slash styled separately. */
    html: function (key, vars) {
      var entry = DICT[key];
      if (!entry) return escapeHtml(key);
      return (
        '<span class="ko">' + escapeHtml(fill(entry.ko, vars)) + "</span>" +
        SEP +
        '<span class="zh">' + escapeHtml(fill(entry.zh, vars)) + "</span>"
      );
    },
    /** Apply every data-i18n / data-i18n-ph / data-i18n-aria in a subtree. */
    apply: function (root) {
      var scope = root || document;
      var nodes = scope.querySelectorAll("[data-i18n]");
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var key = el.getAttribute("data-i18n");
        if (!DICT[key]) continue;
        if (el.hasAttribute("data-i18n-raw")) {
          el.textContent = i18n.t(key);
        } else {
          el.innerHTML = i18n.html(key);
        }
        el.setAttribute("data-i18n-applied", "1");
      }
      var phs = scope.querySelectorAll("[data-i18n-ph]");
      for (var j = 0; j < phs.length; j++) {
        var ph = phs[j];
        var phKey = ph.getAttribute("data-i18n-ph");
        if (DICT[phKey]) ph.setAttribute("placeholder", i18n.t(phKey));
      }
      var arias = scope.querySelectorAll("[data-i18n-aria]");
      for (var k = 0; k < arias.length; k++) {
        var ar = arias[k];
        var arKey = ar.getAttribute("data-i18n-aria");
        if (DICT[arKey]) ar.setAttribute("aria-label", i18n.t(arKey));
      }
    }
  };

  global.BS = global.BS || {};
  global.BS.i18n = i18n;
})(window);
