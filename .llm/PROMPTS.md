你将开发一个网页应用，用来批量扫码签到。

## 项目逻辑

我将开发一个前端和一个后端。前端是每个用户的界面，应该包含以下功能：

用户刚进入页面的时候，应该提示用户输入：API 端点 URL，你应该将这个 URL 保存在 localstorage 里。

然后拉取 /user/list 接口显示目前有的所有用户，让用户选择自己，如果自己不在里面，用户可以创建一个新的用户。用户需要填写用户名、是否被自动签到（默认 true）、cookie 信息，然后依次调用 /user/add、/user/refresh 接口，创建用户并更新用户的 cookie。创建用户接口会返回一个 id，应该保存在 pinia 里。

此后页面会显示一个按钮「扫码签到」，拉起一个摄像头扫码，扫码结果会发送到 /signin 接口，由后端处理解析扫码结果 + 自动给所有需要签到用户签到的逻辑，前端拿到扫码结果和签到结果后回显到页面上。

除了这个按钮之外，主页上还应该有最近 3 条的扫码结果（拉取 /history/scan?count=3）。还应该拉取自己最近的被签到时间（拉取 /history/signin?user_id=<id>），显示最近一次签到的时间（页面展示时用相对时间）。

此外，还应该有设置页面，可以改名、设置自动签到、更新 cookie、或者删除自己这个账号（只能删自己的，即 pinia 里保存的 id）。

此外，还可以显示详细历史，使用 /history/scan 和 /history/signin 接口，可以分页显示。

## 第一步：设计TS数据类型

你需要在 src/types 文件夹中定义以下数据类型：

User 的字段：

id: 随机生成的，唯一
name: 用户名
is_auto：是否参与被自动签到，默认 true

Cookie 的字段：

id：随机生成的，唯一
user_id：关联的用户 id
value：cookie 的具体内容
expires：过期时间
created_at：上传这个 cookie 的时间

UserWithCookie（不是数据库表）：

继承 User，添加 latest_cookie, expires 字段

ScanHistory：

id: 随机生成的，唯一
result：扫码结果
user_id：扫码者
created_at：扫码时间

SigninHistory：

id: 随机生成的，唯一
user_id：给谁签到
cookie：签到时携带的 cookie
scan_history_id：使用的是哪次扫码结果
request_data：发签到请求时携带的数据
response_code：响应状态码
response_data：响应体
created_at：签到时间

## 第二步：在前端项目中封装后端接口

你需要在 src/api 文件夹中封装向后端接口的请求，如下：

所有POST请求的结构体中都应该补加一个字段：ua_info，由以下函数得到：

async function getBrowserInfo() {
  try {
    // 检查是否支持 UA-CH（User-Agent Client Hints）
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      const info = await navigator.userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
        'architecture',
        'bitness',
        'uaFullVersion'
      ]);

      // 构建一个可读字符串
      const uaCHString = [
        `Platform: ${info.platform || 'Unknown'}`,
        `Version: ${info.platformVersion || 'Unknown'}`,
        `Model: ${info.model || 'Unknown'}`,
        `Architecture: ${info.architecture || 'Unknown'}`,
        `Bitness: ${info.bitness || 'Unknown'}`,
        `FullVersion: ${info.uaFullVersion || 'Unknown'}`
      ].join(' | ');

      return uaCHString;
    } else {
      // 回退：使用传统 UA 字符串
      return `User-Agent: ${navigator.userAgent}`;
    }
  } catch (err) {
    console.error('获取 UA 信息失败:', err);
    return `User-Agent: ${navigator.userAgent}`;
  }
}

// 示例调用
getBrowserInfo().then(info => console.log('浏览器信息:', info));

/user/list：列出目前所有需要被签到的用户。

返回的数据结构是 UserWithCookie[]

/user/add：新增一个用户

POST 请求，请求体是 ua_info, name，响应体包含 id

/user/remove/<id>：删除一个用户

POST 请求，请求体只有 ua_info

/user/rename/<id>：给一个用户改名

POST 请求，请求体：ua_info, new_name

/user/refresh/<id>：给一个用户更新cookie

POST 请求，请求体：ua_info, cookie

/user/auto/<id>：给一个用户更新其 is_auto 的值

POST 请求，请求体：ua_info, is_auto

/signin：扫码签到，上传扫码结果，自动给所有用户签到，返回签到结果

POST 请求，请求体：ua_info, scan_result, user_id，返回的数据结构是:

{
  "scan_result": ScanHistory,
  "signin_results": SigninHistory[]
}

/history/signin?count=<count>& user_id=<id>：按时间最近，列出所有签到历史，至多 count 条，如果包含id 则筛选指定 id

/history/scan?count=<count>&user_id=<id>：按时间最近，列出所有扫码历史，至多 count 条，如果包含id 则筛选指定 id


## 第三步：搭建前端

src/pages 文件夹中是项目初始模板，你只需要学习其中的 UnoCSS 和图标写法。按照上文中提到的项目逻辑为我搭建前端。风格使用暗黑风格，尽量少使用蓝色紫色，少使用阴影等廉价的视觉效果，使用简洁的 UI 设计。

