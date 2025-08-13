## 3.4.1

### ⏫功能

- 为前端内置了 [tailwindcss](https://tailwindcss.com/) 库, 现在你可以直接在界面中使用 tailwindcss 的类名了.

## 3.4.0

### 📚脚本库

**内置库:**

- 新增 `世界书强制用推荐的全局设置` 脚本. 这是大多数作者写卡时的默认设置, 本来就没有玩家去修改的必要

### ⏫功能

**世界书:**

- 重新制作世界书接口 `Worldbook`, 原本的所有 `Lorebook` 函数均被弃用 (但仍可运行), 请使用 `Worldbook` 接口, 具体见于[文档](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/%E5%8A%9F%E8%83%BD%E8%AF%A6%E6%83%85/%E4%B8%96%E7%95%8C%E4%B9%A6/%E4%BF%AE%E6%94%B9%E4%B8%96%E7%95%8C%E4%B9%A6.html)或[类型文件 (可以直接发给 ai)](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/function/worldbook.d.ts)
  - 移除了 `getLorebookSettings` 等控制全局设置的功能, 因为很少有需要改动的时候, 取而代之的是内置库新增 `世界书强制用推荐的全局设置` 脚本
  - `getWorldbook` 将直接返回按世界书 "自定义顺序" 排序好的数组 (不知道自定义顺序是什么? 请查看内置库中的 "世界书强制自定义顺序" 说明)

**MVU 变量框架:**

- 新增了 mvu 接口, 现在你可以通过 `Mvu` 来使用 MVU 变量框架中的功能了 (解析 ai 输出的更新命令、监听 mvu 更新变量事件从而调整变量或触发剧情等), 具体见于[文档](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/%E5%8A%9F%E8%83%BD%E8%AF%A6%E6%83%85/%E6%8E%A5%E5%8F%A3%E8%AE%BF%E9%97%AE.html#mvu-%E5%8F%98%E9%87%8F%E6%A1%86%E6%9E%B6)和[类型文件 (可以直接发给 ai)](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/iframe_client/exported.mvu.d.ts), 例如:

  ```typescript
  // 解析包含 _.set() 命令的消息, 从而更新络络好感度为 30
  const old_data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
  const new_data = await Mvu.parseMessage("_.set('角色.络络.好感度', 30); // 强制修改", old_data);
  ```

  ```typescript
  // 在 mvu 变量更新结束时, 保持好感度不低于 0
  eventOn('mag_variable_update_ended', (variables) => {
    if (_.get(variables, 'stat_data.角色.络络.好感度') < 0) {
      _.set(variables, 'stat_data.角色.络络.好感度', 0);
    }
  });
  ```

**变量:**

- 让 `insertOrAssignVariables` 等变量函数返回更新后的变量表, 便于在脚本中使用

**脚本按钮:**

- 新增 `appendInexistentScriptButtons` 函数, 便于为已经有按钮的脚本新增脚本按钮, 例如角色卡作者可能在导入 mvu (`import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@master/artifact/bundle.js'`) 的脚本中自己额外写了代码和按钮, mvu 则可以新增 "重新处理变量" 等按钮但不影响角色卡作者已经写的按钮.

### 🐛修复

- 修复与酒馆 1.12.10 的兼容性
- 修复了无法通过脚本库点开内置库的问题
- 修复了预设对当前加载到设置中的预设内容 (`'in_use'`) 的获取和修改功能
- 修复了 `getPreset` 对预设提示词列表中占位提示词 (如 Chat History) 等开启状态的获取
- 补充了事件发送, 修复了提示词模板更换时间后 `generate` 函数不会触发提示词模板的问题
- 尝试修复切换角色卡时事件监听未能移除的问题

## 3.3.4

### 🐛修复

- `getLorebookEntries` 在一些情况不可用的问题

## 3.3.3

### 🐛修复

- `getLorebookEntries` 在一些情况不可用的问题

## 3.3.2

### ⏫功能

- 更换了内置脚本库等的网络链接 (从 `fastly.jsdelivr.net` 更换为 `testingcf.jsdelivr.net`), 让国内更容易访问
- 为前端和脚本默认置入了 [`zod` 库](https://zod.dev/basics). 通过这个库, 你可以更方便地解析 ai 输出的数据, 并对不符的数据进行**中文报错**. 如果已经配置了[编写模板](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html)请下载新的模板.

  ```typescript
  // 定义一个手机消息数据类型
  type PhoneMessage = z.infer<typeof PhoneMessage>;
  const PhoneMessage = z.object({
    name: z.string()       // `name` 是一个字符串
           .catch('络络'),  // 如果 ai 错误输出了数字之类的, 用 '络络'

    content: z.string()
              .default('络络'),  // 如果 ai 忘了输出 `content`, 用 '你好',

    reply_count: z.number().min(1),  // 至少有一条回复

    time: z.iso.time(),
  });

  const data = JSON.parse(/*假设你从 ai 回复中提取出了一条手机消息*/);
  const phone_message = PhoneMessage.parse(message);
  console.info(data);
  // >> { name: '络络', content: '你好', reply_count: 1, time: '06:15' }
  // 如果解析失败, 将会报错
  // >> 无效输入: 期望 string，实际接收 undefined
  ```

  之后会用这个库修改酒馆助手的 `@types` 文件夹, 允许你检查酒馆助手的如 `ChatMessage` 等数据类型.

## 3.3.1

### ⏫功能

- `{{get_message_variable::}}` 等宏将字符串变量替换为文本时, 将不会用引号包裹内容. 例如 `{{get_message_variable::世界.时间阶段}}` 将不会替换为 `"早上"` 而是 `早上`

### 🐛修复

- `loadPreset` 不能正常使用的问题

## 3.3.0

### ⏫功能

- 更新了一套操控预设的函数, 现在你可以**比酒馆接口更简单地**通过脚本操控酒馆的预设了! 具体函数请自行参考[文档](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能详情/预设操作/创建预设.html)或[类型文件 (可以直接发给 ai)](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/function/preset.d.ts), 如果已经配置了[编写模板](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html)请`pnpm add -D type-fest`并下载新的`@types`文件夹!

  ```typescript
  // 为酒馆正在使用的预设开启流式传输
  await setPreset('in_use', { settings: { should_stream: true } });
  ```

  ```typescript
  // 将 '预设A' 的条目按顺序复制到 '预设B' 开头
  const preset_a = getPreset('预设A');
  const preset_b = getPreset('预设B');
  preset_b.prompts = [...preset_a.prompts, ...preset_b.prompts];
  await replacePreset('预设B', preset_b);
  ```

  ```typescript
  // 将 '预设A' 的条目顺序反过来
  await updatePresetWith('预设A', preset => {
    preset.prompts = preset.prompts.reverse();
    return preset;
  });
  ```

## 3.2.13

### ⏫功能

- 新增 `formatAsTavernRegexedString()` 函数, 可获取酒馆正则处理后的文本结果

  ```typescript
  // 获取最后一楼文本, 将它视为将会作为显示的 AI 输出, 对它应用酒馆正则
  const message = getChatMessages(-1)[0];
  const result = formatAsTavernRegexedString(message.message, 'ai_output', 'display', { depth: 0 });
  ```

### 📚脚本库

**内置库:**

- 新增 `世界书强制自定义排序` 脚本. 很多作者会使用自定义排序来写世界书, 因为他们将能自己拖动改变世界书条目顺序: 按功能分类条目、把允许玩家自定义的条目放在最上面……**所以请使用自定义排序.**

### 🐛修复

- 世界书条目函数将 `与所有` 和 `非任意` 弄反了

## 3.2.12

### 💻界面

- 变量管理器切换为文本视图时, 使用 YAML 而非 JSON 格式显示变量文本, 这更便于编辑

## 3.2.11

### ⏫功能

- 新增 `getAllVariables()` 函数, 直接获取合并后的变量表. 简单来说, 它包含了前端界面/脚本一般会需要的变量表.

  ```typescript
  // 你可以直接写下面一行:
  const variables = getAllVariables();
  ```

  ```typescript
  // 而以前不熟悉代码的人可能出现这个问题

  // 想获取当前消息楼层的 stat_data.好感度
  const variables = _.get(getVariables({type: 'message', message_id: getCurrentMessageId()}), 'stat_data.好感度');

  // 但是新的消息楼层并没有更新变量, 所以没有 stat_data.好感度
  console.info(JSON.stringify(variables));
  // >> null
  ```

## 3.2.10

### 📚脚本库

**内置库:**

- 新增 `查看提示词发送情况` 脚本, 启用后可以在左下角魔棒中打开`提示词发送情况`界面来查看上次发送的提示词情况.

### 🐛修复

- 渲染界面高度问题
- 角色卡头像获取问题

## 3.2.9

### 🐛修复

- 渲染界面大小调整时的显示问题

## 3.2.8

### 🐛修复

- 部分国产浏览器无法渲染的问题

## 3.2.7

### 🐛修复

- 部分国产浏览器无法渲染的问题

## 3.2.6

### ⏫功能

- 默认禁用大多数非报错日志, 从而优化高频性能; 可通过开启 "调试模式" 来启用所有日志

## 3.2.5

### ⏫功能

- 新增 `getScriptButtons` 和 `replaceScriptButtons` 用于获取和替换脚本的按钮设置, 例如, 你可以这样设置二级按钮:

  ```typescript
  eventOnButton('前往地点', () => {
    replaceScriptButtons(getScriptId(), [
      { name: '学校', visible: true },
      { name: '商店', visible: true },
    ]);
  });
  ```

- 新增 `eventEmitAndWait` 用于在非异步函数中监听并等待事件.

## 3.2.4

### 💻界面

- 变量管理器的对象类型增加折叠功能

## 3.2.3

⚠️有破坏性变更, 升级本版本后如果再降级扩展，脚本功能将出现不可预期的问题。如有降级需求，在升级之前备份`sillytavern/data/用户名/settings.json`文件。

### ⏫功能

1. 脚本支持文件夹分组
   - 根据文件夹批量开关脚本
   - 自定义文件夹图标和图标颜色
   - 通过拖动脚本控件，可直接移动到指定文件夹

2. 脚本批量管理
   - 通过全局/角色脚本库文字旁的齿轮图标进入批量操作模式
   - 可以批量删除、移动、导出脚本
   - 脚本导入导出支持zip格式，保留文件夹层级结构
   - 支持搜索脚本
  
3. 脚本支持存储数据
   - 新增脚本变量存储功能，脚本可以存储和读取自己的数据，你可以通过 `getVariables({type: 'script', script_id: getScriptId()})` 等来访问脚本变量
   - 脚本编辑界面新增可视化变量管理
   - 当脚本包含数据时，导出时会弹出选择对话框，注意API-KEY等敏感数据的处理，可清除数据后导出

## 3.2.2

### 🐛修复

- 修复 `{{get_message_variable::stat_data}}` 在第 0 楼中会显示最新数值而不是第 0 楼应该对应数值的问题

## 3.2.1

### 🐛修复

- 修复 `{{get_message_variable::stat_data}}`

## 3.2.0

### ⏫功能

完善了助手宏功能,

- 现在楼层中的 `{{get_message_variable::stat_data}}` 等助手宏将会显示为对应的值, 因此你可以用酒馆正则直接制作带变量的文字状态栏:

  ```typescript
  熟络度: {{get_message_variable::stat_data.络络.熟络度[0]}}
  笨蛋度: {{get_message_variable::stat_data.络络.笨蛋度[0]}}
  ```

- 新增了 `registerMacros` 用于注册新的助手宏:

  ```typescript
  registerMacros(
    /<checkbox>(.*?)<checkbox>/gi,
    (context: Context, substring: string, content: string) => { return content; });
  ```

## 3.1.9

### 🐛修复

- 兼容旧版酒馆，目前支持的最低酒馆版本为1.12.10

## 3.1.8

### 🐛修复

- 修复generateRaw没有注入世界书深度条目的问题
- 修复了当局部脚本关闭时，每次新建对话都会弹出脚本开启提示框的问题
- 修复了变量管理器的部分已知问题

## 3.1.7

### 🐛修复

- 修复在快速回复未启用，但勾选了合并快速回复时，快速回复按钮栏高度异常的问题
- 修复了从界面添加或删除快速回复集时，脚本按钮消失的问题

## 3.1.6

### 🐛修复

- 修复 `setLorebookEntries`

## 3.1.5

### 💻界面

- 为变量管理器添加 json 解析

### ⏫功能

- 补充单文件的酒馆助手函数参考文件, 从而方便手机端

### 🐛修复

- 修复变量管理器数组的保存问题
- 修复更换聊天时, 局部脚本未正确清理的问题

## 3.1.4

### ⏫功能

- 补充 `builtin.addOneMessage`, 用于向页面添加某一楼消息

## 3.1.3

### 💻界面

- 脚本按钮不再单独占用一行，现在与快速回复按钮一起显示，多个脚本的按钮是否合为一行由快速回复的“合并快速回复”按钮控制
- 播放器标签页更名为工具箱，播放器移动到工具箱子菜单
- 输入框旁的快捷菜单增加快速打开变量管理器的按钮

### ⏫功能

- 新增变量管理器，可对全局、角色、聊天、消息变量进行可视化管理

### 🐛修复

- 修复 `setVariables` 对消息楼层变量进行操作时意外触发渲染事件的问题
- 修复了切换角色时上一个角色的角色脚本错误地复制到当前角色的问题
- 修复了按钮容器错误创建的问题

## 3.1.2

### 💻界面

- 在界面中新增到[酒馆命令自查手册](https://rentry.org/sillytavern-script-book)的参考链接
- 拆分了渲染优化和折叠代码块选项, 现在你可以单独禁用代码块的高亮从而优化渲染速度

### ⏫功能

- 为 `ChatMessage` 补充了 `extra` 字段, 为 `ChatMessageSwiped` 补充了 `swipes_info` 字段.
- 新增了 `createChatMessages` 接口来增加新的消息, 相比于 `/send` 和 `/sendas`, 它支持批量创建

  ```typescript
  // 在末尾插入一条消息
  await createChatMessages([{role: 'user', message: '你好'}]);
  ```

  ```typescript
  // 在第 10 楼前插入两条消息且不需要刷新显示
  await createChatMessages([{role: 'user', message: '你好'}, {role: 'assistant', message: '我好'}], {insert_at: 10});
  ```

- 新增了 `deleteChatMessages` 接口来删除消息, 相比于 `/del`, 它支持批量删除以及零散地进行删除

  ```typescript
  // 删除第 10 楼、第 15 楼、倒数第二楼和最后一楼
  await deleteChatMessages([10, 15, -2, getLastMessageId()]);
  ```

  ```typescript
  // 删除所有楼层
  await deleteChatMessages(_.range(getLastMessageId() + 1));
  ```

- 新增了 `rotateChatMessages` 接口来调整消息顺序

  ```typescript
  // 将 [4, 7) 楼放到 [2, 4) 楼之前, 即, 将 4-6 楼放到 2-3 楼之前
  await rotateChatMessages(2, 4, 7);
  ```

  ```typescript
  // 将最后一楼放到第 5 楼之前
  await rotateChatMessages(5, getLastMessageId(), getLastMessageId() + 1);
  ```

  ```typescript
  // 将最后 3 楼放到第 1 楼之前
  await rotateChatMessages(1, getLastMessageId() - 2, getLastMessageId() + 1);
  ```

  ```typescript
  // 将前 3 楼放到最后
  await rotateChatMessages(0, 3, getLastMessageId() + 1);
  ```

- 新增了 `getChatLorebook` 和 `setChatLorebook` 对聊天世界书进行更直接的控制
- 为 `getOrCreateChatLorebook` 新增一个可选参数, 从而允许自定义聊天世界书名称:

  ```typescript
  // 如果聊天世界书不存在, 则尝试创建一个名为 '你好' 的世界书作为聊天世界书
  const lorebook = await getOrCreateChatLorebook('你好');
  ```

### 🐛修复

- 修复 `getCharLorebooks` 不能获取到附加世界书的问题

## 3.1.1

### ⏫功能

- 新增了 `setChatMessages` 接口, 相比原来的 `setChatMessage` 更灵活——你现在可以直接地跳转开局、隐藏消息等等.

  ```typescript
  // 修改第 10 楼被 ai 使用的消息页的正文
  await setChatMessages([{message_id: 10, message: '新的消息'}]);
  ```

  ```typescript
  // 补充倒数第二楼的楼层变量
  const chat_message = getChatMessages(-2)[0];
  _.set(chat_message.data, '神乐光好感度', 5);
  await setChatMessages([{message_id: 0, data: chat_message.data}], {refresh: 'none'});
  ```

  ```typescript
  // 切换为开局 3
  await setChatMessages([{message_id: 0, swipe_id: 2}]);
  ```

  ```typescript
  // 隐藏所有楼层
  const last_message_id = getLastMessageId();
  await setChatMessages(_.range(last_message_id + 1).map(message_id => ({message_id, is_hidden: true})));
  ```

- 调整了 `getChatMessage` 接口, 现在返回类型将根据是否获取 swipes 部分 (`{ include_swipes: boolean }`) 返回 `ChatMessage[]` 或 `ChatMessageSwiped[]`.

  ```typescript
  // 仅获取第 10 楼被 ai 使用的消息页
  const chat_messages = getChatMessages(10);
  const chat_messages = getChatMessages('10');
  const chat_messages = getChatMessages('10', { include_swipes: false });
  // 获取第 10 楼所有的消息页
  const chat_messages = getChatMessages(10, { include_swipes: true });
  ```

  ```typescript
  // 获取最新楼层被 ai 使用的消息页
  const chat_message = getChatMessages(-1)[0];  // 或 getChatMessages('{{lastMessageId}}')[0]
  // 获取最新楼层所有的消息页
  const chat_message = getChatMessages(-1, { include_swipes: true })[0];  // 或 getChatMessages('{{lastMessageId}}', { include_swipes: true })[0]
  ```

  ```typescript
  // 获取所有楼层被 ai 使用的消息页
  const chat_messages = getChatMessages('0-{{lastMessageId}}');
  // 获取所有楼层所有的消息页
  const chat_messages = getChatMessages('0-{{lastMessageId}}', { include_swipes: true });
  ```

### 🐛修复

- 现在 `setChatMessage` 使用 `refresh: 'display_and_render_current'` 选项时将会发送对应的酒馆渲染事件从而激活对应的监听器, 而不只是渲染 iframe.

## 3.1.0

现在所有内置库脚本将使用 `import 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/标签化/index.js'` 的形式从仓库直接获取最新代码, **因此脚本将永远保持最新**, 你不再需要为了更新脚本重新导入脚本.

## 3.0.7

### ⏫功能

- 导出了 `toastr` 库, 你现在可以用 `toastr.error('内容', '标题')` 而不是 `triggerSlash('/echo severity=error title=标题 内容')` 来进行酒馆提示了:
  - `toastr.info`
  - `toastr.success`
  - `toastr.warning`
  - `toastr.error`

## 3.0.6

### 🐛修复

- 修复世界书条目操作后, 以前版本酒馆可能不能正常显示世界书条目的问题

## 3.0.5

### 💻界面

- 新导入的脚本将添加到末尾而不是开头
- 在脚本编辑界面新建按钮将默认是启用的

### 📚脚本库

**内置库:**

- 新增 `预设防误触` 脚本, 启用后将锁定预设除了 '流式传输'、'请求思维链' 和 '具体条目' 以外的选项, 不能通过界面来修改

### ⏫功能

**世界书条目操作:**

- 新增 `replaceLorebookEntries` 和 `updateLorebookEntriesWith` 函数, 相比于原来的 `setLorebookEntries` 等函数更方便

  ```typescript
  // 禁止所有条目递归, 保持其他设置不变
  const entries = await getLorebookEntries("eramgt少女歌剧");
  await replaceLorebookEntries("eramgt少女歌剧", entries.map(entry => ({ ...entry, prevent_recursion: true })));
  ```

  ```typescript
  // 删除所有名字中包含 `神乐光` 的条目
  const entries = await getLorebookEntries("eramgt少女歌剧");
  _.remove(entries, entry => entry.comment.includes('神乐光'));
  await replaceLorebookEntries("eramgt少女歌剧", entries);
  ```

- 新增 `createLorebookEntry` 和 `deleteLorebookEntry` 的数组版本: `createLorebookEntries` 和 `deleteLorebookEntries`

### 🐛修复

- 部分函数不兼容以前版本的问题

## 3.0.4

### 🐛修复

- 深度输入框为0时无法正确加载
- 快速回复代码编辑界面在开启前端优化时无法正确显示

## 3.0.3

### 💻界面

- 现在脚本导入发生冲突时, 将可以选择是 '新建脚本' 还是 '覆盖原脚本'.

### 📚脚本库

**内置库:**

- 让`标签化`能开关酒馆助手脚本

### 🐛修复

- 在没有打开角色卡时 `replaceTavernRegexes` 意外报错

## 3.0.2

### 📚脚本库

**内置库:**

- 优化了`标签化`的执行速度
- 让`自动关闭前端卡不兼容选项`也会关闭 "在响应中显示标签"
- 添加了`样式加载`脚本
- 添加了`资源预载`脚本

### ⏫功能

- 新增 `getScriptId` 函数, 可以在脚本中获取脚本的唯一 id

- `getVariables` 等变量操作现在支持获取和修改绑定在角色卡的变量, 你也可以在酒馆助手 "脚本库" 设置界面的 "变量" 按钮手动修改角色卡变量.

  ```typescript
  const variables = getVariables({type: 'character'});
  ```

- `getVariables` 等变量操作现在支持获取和修改某层消息楼层的变量，并支持负数来获取倒数楼层的变量（如 `-1` 为最新一条消息）

  ```typescript
  const variables = getVariables({type: 'message', message_id: -1});
  ```

- `getChatMessage` 和 `setChatMessage` 也支持了用负数来获取倒数楼层

### 🐛修复

- 实时修改监听器不能监听脚本

## 3.0.1

### 🐛修复

- 部分函数无法正常使用
- 音频播放器无法正常播放
- getCharacterRegexes在不选择角色时错误抛出异常

## 3.0.0

### 💻全新用户界面

- 重新设计了整体界面布局，各功能模块独立控制启用

### ⏫版本管理

- 扩展启动时自动检查版本并提示更新，点击更新按钮可查看最新版本到本地版本的更新日志

### 📚脚本库功能

- 新增脚本库功能，支持脚本的统一管理
- 提供脚本导入导出功能
- 脚本可与角色卡一同导出，导入角色卡时自动导入脚本
- 新增绑定到角色卡的变量，可被扩展读取及与角色卡一同导出
- 内置库中拥有扩展提供的实用功能脚本

### 🔌扩展性增强

- 将酒馆助手核心函数注册到全局作用域
- 支持其他扩展插件调用酒馆助手的功能

### ✍️写卡体验提升

请阅读 [【正确使用酒馆助手编写前端界面教程】【直播】刚装好的win11喵从安装软件开始](https://discord.com/channels/1291925535324110879/1374317316631695370/1374330019446263879)

- 支持真实时修改，只需要在软件中修改代码，酒馆就会立即更新内容
- 支持拆分文件编写，为界面不同功能拆分逻辑
- 支持使用 package.json 自行加入第三方库
