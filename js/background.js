console.log("background is done!");

// 引入需要的库
importScripts("moment.min.js");
importScripts("axios.min.js");

let emojiReg = /[\uD83C|\uD83D|\uD83E][\uDC00-\uDFFF][\u200D|\uFE0F]|[\uD83C|\uD83D|\uD83E][\uDC00-\uDFFF]|[0-9|*|#]\uFE0F\u20E3|[0-9|#]\u20E3|[\u203C-\u3299]\uFE0F\u200D|[\u203C-\u3299]\uFE0F|[\u2122-\u2B55]|\u303D|[\A9|\AE]\u3030|\uA9|\uAE|\u3030/gi;
let handleGithubGistLog = [];
let gitHubApiUrl = "https://api.github.com";
let usedSeconds;
let pushToGithubGistStatus;
let githubGistToken;
let githubGistId;
// 定义一个n次循环定时器
let githubIntervalId;
let isLock = false;

// 监听插件状态变化的事件
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        // 这里是插件第一次安装时要执行的代码
        console.log('插件已被安装！');
        setTimer('inTimeSync', 3 * 1000);
    } else if (details.reason === 'update') {
        // 这里是插件更新时要执行的代码
        console.log('插件已被更新！');
        setTimer('inTimeSync', 3 * 1000);
    }
});

// 获取tab数量并在popup上显示
chrome.tabs.query({currentWindow: true}, function (tab) {
    chrome.action.setBadgeText({text: tab.length + ""});
    chrome.action.setBadgeBackgroundColor({color: "#0038a8"});
});

// 持续监听，当tab被激活的时候刷新一下pop上badge的tab的数量
chrome.tabs.onActivated.addListener(function callback() {
    chrome.tabs.query({}, function (tab) {
        chrome.action.setBadgeText({text: tab.length + ""});
        chrome.action.setBadgeBackgroundColor({color: "#0038a8"});
    });
});

// 持续监听，当tab被关闭的时候刷新一下pop上badge的tab的数量
chrome.tabs.onRemoved.addListener(function callback() {
    chrome.tabs.query({}, function (tab) {
        chrome.action.setBadgeText({text: tab.length + ""});
        chrome.action.setBadgeBackgroundColor({color: "#0038a8"});
    });
});

// 持续监听，当tab被创建的时候刷新一下pop上badge的tab的数量
chrome.tabs.onCreated.addListener(function callback() {
    chrome.tabs.query({}, function (tab) {
        chrome.action.setBadgeText({text: tab.length + ""});
        chrome.action.setBadgeBackgroundColor({color: "#0038a8"});
    });
});

// 获取本机storage
chrome.storage.local.get(function (storage) {
    console.log(storage);
});

// 获取可同步storage
chrome.storage.sync.get(function (storage) {
    console.log(storage);
});

// 创建定时同步github任务，至于是否真的同步，要看设置
chrome.alarms.create("checkAutoSyncGithub", {delayInMinutes: 90, periodInMinutes: 90});

// 检查是否同步github的gist
function checkAutoSyncGithub() {
    console.log("检查github是否同步")
    chrome.storage.local.get(null, function (items) {
        let autoSync = items.autoSync
        if (autoSync === true) {
            console.log("autoSync open")
            startPushToGithubGist();
        }
    });
}

// 开始推送github的gist
function startPushToGithubGist() {
    console.log("开始推送github")
    handleGithubGistLog.length = 0;
    handleGithubGistLog.push(`${chrome.i18n.getMessage("start")}${moment().format('YYYY-MM-DD HH:mm:ss')}`);
    handleGithubGistLog.push(`${chrome.i18n.getMessage("autoPushToGithubGist")}`)
    chrome.storage.local.get(null, function (storage) {
        console.log(storage.handleGistStatus);
        if (storage.handleGistStatus) {
            console.log("handleGistStatus有值");
            if (storage.handleGistStatus.type === "IDLE") {
                pushToGithubGist();
            } else {
                let time = moment().format('YYYY-MM-DD HH:mm:ss');
                let expireTime = storage.handleGistStatus.expireTime;
                console.log(expireTime)
                if (time > expireTime) {
                    pushToGithubGist();
                } else {
                    handleGithubGistLog.push(storage.handleGistStatus.type)
                    handleGithubGistLog.push(`${chrome.i18n.getMessage("endPushToGithubGistTask")}`)
                    handleGithubGistLog.push(`${chrome.i18n.getMessage("end")}${moment().format('YYYY-MM-DD HH:mm:ss')}`);
                    setHandleGistLog(`${chrome.i18n.getMessage("autoPushGithub")}`, handleGithubGistLog);
                }
            }
        } else {
            console.log("handleGistStatus没有值，第一次");
            pushToGithubGist();
        }
    });
}

// 推送到github的gist
function pushToGithubGist() {
    console.log("推送github")
    setHandleGistStatus(`${chrome.i18n.getMessage("pushToGithubGistIng")}`);
    usedSeconds = 0;
    pushToGithubGistStatus = `${chrome.i18n.getMessage("startPushToGithubGistTask")}`;
    handleGithubGistLog.push(`${chrome.i18n.getMessage("startPushToGithubGistTask")}`)
    if (typeof (pushToGithubGistStatus) != "undefined") {
        githubIntervalId = setInterval(function () {
            if (typeof (pushToGithubGistStatus) != "undefined") {
                usedSeconds++;
            } else {
                clearInterval(githubIntervalId);
                handleGithubGistLog.push(`${usedSeconds}${chrome.i18n.getMessage("secondWait")}`)
                handleGithubGistLog.push(`${chrome.i18n.getMessage("endPushToGithubGistTask")}`)
                handleGithubGistLog.push(`${chrome.i18n.getMessage("end")}${moment().format('YYYY-MM-DD HH:mm:ss')}`);
                setHandleGistStatus("IDLE");
                setHandleGistLog(`${chrome.i18n.getMessage("autoPushGithub")}`, handleGithubGistLog);
            }
        }, 1000);
        console.log(githubIntervalId)
        isStoredGithubTokenLocal("push_github");
    }
}

// 判断是否已经保存github的Token
function isStoredGithubTokenLocal(action) {
    console.log("是否已经保存github的Token")
    handleGithubGistLog.push(`${chrome.i18n.getMessage("startCheckGithubTokenSaved")}`);
    chrome.storage.local.get("githubGistToken", function (storage) {
        if (storage.githubGistToken) {
            console.log("已经保存github的Token")
            handleGithubGistLog.push(`${chrome.i18n.getMessage("githubTokenSaved")}`);
            githubGistToken = storage.githubGistToken;
            isStoredGithubGistIdLocal(action);
        } else {
            console.log("没有保存github的Token")
            handleGithubGistLog.push(`${chrome.i18n.getMessage("githubTokenNoSaved")}`);
            pushToGithubGistStatus = undefined;
        }
    });
}

// 判断是否已经保存了github的gistId
function isStoredGithubGistIdLocal(action) {
    console.log("是否已经保存了github的gistId")
    handleGithubGistLog.push(`${chrome.i18n.getMessage("startCheckGistIdSaved")}`)
    chrome.storage.local.get("githubGistId", function (storage) {
        if (storage.githubGistId) {
            console.log("已经保存了github的gistId")
            handleGithubGistLog.push(`${chrome.i18n.getMessage("gistIdSaved")}`)
            githubGistId = storage.githubGistId;
            if (action === "push_github") {
                getShardings(function (callback) {
                    if (!callback || typeof callback == 'undefined') {
                        updateGithubGist([]);
                    } else {
                        updateGithubGist(callback);
                    }
                })
            }
        } else {
            console.log("没有保存了github的gistId")
            handleGithubGistLog.push(`${chrome.i18n.getMessage("gistIdNoSaved")}`)
            pushToGithubGistStatus = undefined;
        }
    });
}

// 更新github的gist
function updateGithubGist(content) {
    console.log("更新github的gist")
    handleGithubGistLog.push(`${chrome.i18n.getMessage("directUpdate")}`)
    let _content = JSON.stringify(content);
    let data = {
        "description": "myCloudSkyMonster", "public": false, "files": {
            "brower_Tabs.json": {"content": _content}
        }
    }
    let myHeaders = new Headers();
    myHeaders.append("Authorization", "token " + githubGistToken)
    myHeaders.append("accept", "application/vnd.github+json")
    myHeaders.append("Content-Type", "application/json");
    let requestOptions = {
        method: 'PATCH', headers: myHeaders, body: JSON.stringify(data),
    };

    fetch(gitHubApiUrl + "/gists/" + githubGistId, requestOptions)
        .then(response => {
            if (response.status === 200) {
                console.log("更新成功")
                handleGithubGistLog.push(`${chrome.i18n.getMessage("updateSuccess")}`)
            } else {
                console.log("更新失败")
                handleGithubGistLog.push(`${chrome.i18n.getMessage("updateFailed")}`)
            }
        })
        .catch(error => {
            console.log('error', error)
            handleGithubGistLog.push(`${chrome.i18n.getMessage("updateFailed")}-->${error.toString()}`)
        })
        .finally(() => {
            // 请求完成时触发，无论成功还是失败
            console.log('Request completed');
            pushToGithubGistStatus = undefined;
        });
}

// 构造操作gist的日志结构
function setHandleGistLog(type, handleGistLog) {
    let handleGistLogMap = {id: genObjectId(), handleGistType: type, handleGistLogs: handleGistLog};
    chrome.storage.local.get(null, function (storage) {
        if (storage.gistLog) {
            console.log("gistLog有值");
            if (storage.gistLog.length >= 100) {
                let newArr = storage.gistLog;
                newArr.splice(-1, 1)
                newArr.unshift(handleGistLogMap);
                chrome.storage.local.set({gistLog: newArr});
            } else {
                let newArr = storage.gistLog;
                newArr.unshift(handleGistLogMap);
                chrome.storage.local.set({gistLog: newArr});
            }
        } else {
            console.log("gistLog没有值，第一次");
            chrome.storage.local.set({gistLog: [handleGistLogMap]});
        }
    });
}

// 操作gist的全局状态，1分钟自动解锁，防止死锁
function setHandleGistStatus(status) {
    let expireTime = moment().add(1, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    let gistStatusMap = {type: status, expireTime: expireTime};
    chrome.storage.local.set({handleGistStatus: gistStatusMap});
}

// 判断是否中文
function isChinese(str) {
    var reg = /[\u4e00-\u9fa5]/; // 使用Unicode范围匹配中文字符
    return reg.test(str);
}

// 判断是否英文
function isEnglish(str) {
    var reg = /^[a-zA-Z]+$/; // 匹配纯英文字符
    return reg.test(str);
}

// 调用腾讯交互翻译api
function translateFunc(txt) {
    console.log("开始翻译！");
    let source = "en"
    let target = "zh"
    if (isChinese(txt)) {
        source = "zh"
        target = "en"
    }
    if (isEnglish(txt)) {
        source = "en"
        target = "zh"
    }
    let url = "https://transmart.qq.com/api/imt"
    let data = JSON.stringify({
        "header": {
            "fn": "auto_translation",
            "session": "",
            "client_key": "browser-chrome-117.0.0-Windows 10-4daf3e2e-b66e-43a1-944a-a8f6b42c9199-1696226243060",
            "user": ""
        }, "type": "plain", "model_category": "normal", "text_domain": "general", "source": {
            "lang": source, "text_list": [txt]
        }, "target": {
            "lang": target
        }
    })
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    let requestOptions = {
        method: 'POST', headers: myHeaders, body: data,
    };

    fetch(url, requestOptions)
        .then(response => response.json())
        .then(result => {
            console.log(result.header.ret_code)
            if (result.header.ret_code) {
                console.log(result.auto_translation[0]);
                sendMessageToContentScript("translateResult", result.auto_translation[0]);
            } else {
                sendMessageToContentScript("translateResult", "--FAILED--!");
            }
        })
        .catch(error => {
            console.log('error', error)
            sendMessageToContentScript("translateResult", "--ERROR,may be lost network--!");
        });
}

// 持续监听发送给background的消息
chrome.runtime.onMessage.addListener(function (req, sender, sendRes) {
    switch (req.action) {
        case 'translate': // 翻译
            translateFunc(req.message);
            sendRes('ok'); // acknowledge
            break;
        case 'save-all': // 保存所有tab
            if (req.tabsArr.length > 0) {
                saveTabs(req.tabsArr);
                openBackgroundPage();
                closeTabs(req.tabsArr);
            } else {
                openBackgroundPage();
            }
            sendRes('ok'); // acknowledge
            break;
        case 'openbackgroundpage': // 打开展示页
            openBackgroundPage();
            sendRes('ok'); // acknowledge
            break;
        case 'save-current': // 保存当前tab
            chrome.storage.local.get(function (storage) {
                let opts = storage.options
                let openBackgroundAfterSendTab = "yes"
                if (opts) {
                    openBackgroundAfterSendTab = opts.openBackgroundAfterSendTab || "yes"
                }
                if (req.tabsArr.length > 0) {
                    saveTabs(req.tabsArr);
                    if (openBackgroundAfterSendTab === "yes") {
                        openBackgroundPage();
                    }
                    closeTabs(req.tabsArr);
                } else {
                    if (openBackgroundAfterSendTab === "yes") {
                        openBackgroundPage();
                    }
                }
            })
            sendRes('ok'); // acknowledge
            break;
        case 'save-others': // 保存其他tab
            if (req.tabsArr.length > 0) {
                saveTabs(req.tabsArr);
                openBackgroundPage();
                closeTabs(req.tabsArr);
            } else {
                openBackgroundPage();
            }
            sendRes('ok'); // acknowledge
            break;
        default:
            sendRes('nope'); // acknowledge
            break;
    }
});

// 向content-script主动发送消息
function sendMessageToContentScript(action, message) {
    chrome.tabs.query({active: true, currentWindow: true}, function (res) {
        chrome.tabs.sendMessage(res[0].id, {action: action, message: message}, function (response) {
            if (response === 'ok') {
                console.log("background-->content发送的消息被消费了");
            }
        });
    });
}

// 生成唯一标识
// refer: https://gist.github.com/solenoid/1372386
let genObjectId = function () {
    let timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
        return (Math.random() * 16 | 0).toString(16);
    }).toLowerCase();
};

// makes a tab group, filters it and saves it to localStorage
function saveTabs(tabsArr) {
    let tabGroup = makeTabGroup(tabsArr), cleanTabGroup = filterTabGroup(tabGroup);

    saveTabGroup(cleanTabGroup);
}

// from the array of Tab objects it makes an object with date and the array
function makeTabGroup(tabsArr) {
    let date;
    date = dateFormat("YYYY-mm-dd HH:MM:SS", new Date());
    let tabGroup = {
        date: date, id: genObjectId() // clever way to quickly get a unique ID
    };
    let res = tabsArr.map(({title, url}) => ({title, url}));
    tabGroup.tabs = res;
    tabGroup.isLock = false;
    tabGroup.groupTitle = '';
    tabGroup.isPined = false;
    return tabGroup;
}

// filters tabGroup
function filterTabGroup(tabGroup) {
    for (let i = 0; i < tabGroup.tabs.length; i++) {
        let title = tabGroup.tabs[i].title
        if (title && typeof (title) !== undefined) {
            tabGroup.tabs[i].title = title.replace(emojiReg, "");
        }
    }
    return tabGroup;
}

// saves array (of Tab objects) to localStorage
function saveTabGroup(tabGroup) {
    getShardings(function (callback) {
        if (callback || typeof callback != 'undefined' || callback !== undefined) {
            if (!callback.tabGroups || typeof callback.tabGroups == 'undefined') {
                saveShardings([tabGroup], "object");
            } else {
                let newArr = callback.tabGroups;
                // 判断是否有置顶，有置顶的话，新元素要放到所有置顶后面
                let flag = false
                for (let i = 0; i < newArr.length; i++) {
                    const currentElement = newArr[i];
                    if (currentElement.isPined === undefined || currentElement.isPined === false) {
                        newArr.splice(i, 0, tabGroup);
                        flag = true
                        break;
                    }
                }
                // 如果所有元素都是已固定的，则将新元素添加到数组末尾
                if (!flag) {
                    newArr.push(tabGroup);
                }
                saveShardings(newArr, "object");
            }
        } else {
            saveShardings([tabGroup], "object");
        }
    })
}

// 打开background页
function openBackgroundPage() {
    let pinnedTabsCount = 0
    // 查询当前窗口的所有标签页
    chrome.tabs.query({currentWindow: true}, function (tabs) {
        // 统计固定标签的数量
        pinnedTabsCount = tabs.filter(tab => tab.pinned).length;
    });
    chrome.tabs.query({url: "chrome-extension://*/workbench.html*", currentWindow: true}, function (tab) {
        if (tab.length >= 1) {
            chrome.tabs.move(tab[0].id, {index: 0}, function callback() {
                chrome.tabs.update(tab[0].id, {highlighted: true});
            });
            chrome.tabs.reload(tab[0].id, {}, function (tab) {
            });
        } else {
            chrome.tabs.create({index: 0, url: chrome.runtime.getURL('workbench.html')});
        }
    });
}

// 暗地里刷新background页
function reloadBackgroundPage() {
    chrome.tabs.query({url: "chrome-extension://*/workbench.html*", currentWindow: true}, function (tab) {
        if (tab.length >= 1) {
            chrome.tabs.reload(tab[0].id, {}, function (tab) {
            });
        }
    });
}

// close all the tabs in the provided array of Tab objects
function closeTabs(tabsArr) {
    let tabsToClose = [], i;

    for (i = 0; i < tabsArr.length; i += 1) {
        tabsToClose.push(tabsArr[i].id);
    }

    chrome.tabs.remove(tabsToClose, function () {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        }
    });
}

// 日期格式化
function dateFormat(fmt, date) {
    let ret;
    let opt = {
        "Y+": date.getFullYear().toString(),        // 年
        "m+": (date.getMonth() + 1).toString(),     // 月
        "d+": date.getDate().toString(),            // 日
        "H+": date.getHours().toString(),           // 时
        "M+": date.getMinutes().toString(),         // 分
        "S+": date.getSeconds().toString()          // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length === 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")));
        }

    }

    return fmt;
}

// 用分片的思路去存storage
function saveShardings(tabGroup, type) {
    let tabGroupStr;
    if (type === "object") {
        tabGroupStr = JSON.stringify(tabGroup);
    } else if (type === "string") {
        tabGroupStr = tabGroup;
    } else if (type === "del") {
        tabGroupStr = JSON.stringify(tabGroup);
    }
    if (tabGroupStr && tabGroupStr !== 'null' && tabGroupStr !== 'undefined') {
        // 字符串有值的逻辑
        let length = tabGroupStr.length;
        let sliceLength = 102400;
        let tabGroupSlices = {}; // 保存分片数据
        let i = 0; // 分片序号

        // 前缀
        let prefix = "tabGroups_"
        if (type === "del") {
            prefix = "del_tabGroups_"
        }
        // 分片保存数据
        while (length > 0) {
            tabGroupSlices[prefix + i] = tabGroupStr.substr(i * sliceLength, sliceLength);
            length -= sliceLength;
            i++;
        }

        // 保存分片数量
        tabGroupSlices[prefix + "num"] = i;

        // 写入Storage
        chrome.storage.local.set(tabGroupSlices);
    } else {
        // 字符串为空或为 null 或 undefined 的逻辑
        console.log('为空或为null/undefined');
    }
}

// 获取storage里的标签相关数据
function getShardings(cb) {
    chrome.storage.local.get(null, function (items) {
        let tabGroupsStr = "";
        if (items.tabGroups_num >= 1) {
            // 把分片数据组成字符串
            for (let i = 0; i < items.tabGroups_num; i++) {
                tabGroupsStr += items["tabGroups_" + i];
                delete items["tabGroups_" + i]
            }
        }
        let delTabGroupsStr = "";
        if (items.del_tabGroups_num >= 1) {
            // 把分片数据组成字符串
            for (let i = 0; i < items.del_tabGroups_num; i++) {
                delTabGroupsStr += items["del_tabGroups_" + i];
                delete items["del_tabGroups_" + i]
            }
        }
        delete items.tabGroups_num
        delete items.del_tabGroups_num
        delete items.gistLog
        delete items.handleGistStatus
        delete items.githubGistId
        delete items.githubGistToken
        if (tabGroupsStr.length > 0) {
            items["tabGroups"] = JSON.parse(tabGroupsStr)
        }
        if (delTabGroupsStr.length > 0) {
            items["delTabGroups"] = JSON.parse(delTabGroupsStr)
        }
        cb(items)
    });
}

// 持续监听，假如锁屏或者睡眠就清空定时任务，激活再重新定时任务
chrome.idle.onStateChanged.addListener(function (newState) {
    console.log(newState)
    if (newState === "active") {
        if (isLock) {
            chrome.alarms.create("checkAutoSyncGithub", {delayInMinutes: 90, periodInMinutes: 90});
            isLock = false;
        }
    }
    if (newState === "locked") {
        isLock = true;
        chrome.alarms.clearAll(function (wasCleared) {
            console.log(wasCleared)
        });
    }
    chrome.alarms.getAll(function (alarms) {
        console.log(alarms)
    });
});

// 持续监听响应定时任务
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "checkAutoSyncGithub") {
        console.log("自动同步github")
        checkAutoSyncGithub();
    }
    if (alarm.name === "inTimeSync") {
        // console.log("实时同步触发")
        subtractAll()

        setTimer('inTimeSync', 3 * 1000);
    }
});

// 持续监听是否按了manifest设置的快捷键
chrome.commands.onCommand.addListener(function (command) {
    if (command === "toggle-feature-save-all") {
        chrome.storage.local.get(function (storage) {
            chrome.tabs.query({
                url: ["https://*/*", "http://*/*", "chrome://*/*", "file://*/*"], currentWindow: true
            }, function (tabs) {
                var tabsArr = tabs.filter(function (tab) {
                    return !tab.pinned;
                });
                let opts = storage.options
                let openBackgroundAfterSendTab = "yes"
                if (opts) {
                    openBackgroundAfterSendTab = opts.openBackgroundAfterSendTab || "yes"
                }
                saveTabs(tabsArr);
                if (openBackgroundAfterSendTab === "yes") {
                    openBackgroundPage();
                } else {
                    reloadBackgroundPage()
                }
                closeTabs(tabsArr);
            });
        });
    }
    if (command === "toggle-feature-save-current") {
        chrome.storage.local.get(function (storage) {
            chrome.tabs.query({
                url: ["https://*/*", "http://*/*", "chrome://*/*", "file://*/*"], highlighted: true, currentWindow: true
            }, function (tabs) {
                var tabsArr = tabs.filter(function (tab) {
                    return !tab.pinned;
                });
                let opts = storage.options
                let openBackgroundAfterSendTab = "yes"
                if (opts) {
                    openBackgroundAfterSendTab = opts.openBackgroundAfterSendTab || "yes"
                }
                if (tabsArr.length > 0) {
                    saveTabs(tabsArr);
                    if (openBackgroundAfterSendTab === "yes") {
                        openBackgroundPage();
                    } else {
                        reloadBackgroundPage()
                    }
                    closeTabs(tabsArr);
                } else {
                    if (openBackgroundAfterSendTab === "yes") {
                        openBackgroundPage();
                    } else {
                        reloadBackgroundPage()
                    }
                }
            });
        })
    }

});

// 持续监听storage是否修改
chrome.storage.onChanged.addListener(function (changes, areaName) {
    let flag = false;
    console.log(changes)
    console.log(areaName)
    for (let key in changes) {
        if (key.indexOf("tabGroups") !== -1 || key.indexOf("del_tabGroups") !== -1) {
            console.log(key)
            if (key.indexOf("tabGroups_num") === -1 || key.indexOf("del_tabGroups_num") === -1) {
                flag = true;
            }
        }
    }
    if (areaName === "local" && flag) {
        console.log("要同步")
        chrome.storage.local.get(null, async function (items) {
            let autoSync = items.autoSync
            if (autoSync === true) {
                console.log("autoSync open")
                // 有storage变化就安全数字+1，因为storage不知道底层是怎么实现的，一个set操作，可能会触发多次onChanged，会变相变成并发操作
                await add()
            }
        });
    } else {
        console.log("不要同步")
    }
});

// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled
chrome.runtime.onInstalled.addListener(async () => {
    // 发送当前标签
    chrome.contextMenus.create({
        id: "sendCurrentTab", title: `${chrome.i18n.getMessage("sendCurrentTab")}`, contexts: ["all"]
    });

    // 打开后台管理页
    chrome.contextMenus.create({
        id: "showAllTabs", title: `${chrome.i18n.getMessage("showAllTabs")}`, contexts: ["all"]
    });

    // 发送所有标签
    chrome.contextMenus.create({
        id: "sendAllTabs", title: `${chrome.i18n.getMessage("sendAllTabs")}`, contexts: ["all"]
    });

    // 发送其他标签
    chrome.contextMenus.create({
        id: "sendOtherTabs", title: `${chrome.i18n.getMessage("sendOtherTabs")}`, contexts: ["all"]
    });

    // 发送左侧标签页
    chrome.contextMenus.create({
        id: "sendLeftTabs", title: `${chrome.i18n.getMessage("sendLeftTabs")}`, contexts: ["all"]
    });

    // 发送右侧标签页
    chrome.contextMenus.create({
        id: "sendRightTabs", title: `${chrome.i18n.getMessage("sendRightTabs")}`, contexts: ["all"]
    });

});

// 持续监听菜单栏的点击
chrome.contextMenus.onClicked.addListener(function (info, tab) {
    console.log(info, tab);
    switch (info.menuItemId) {
        case "sendCurrentTab":
            chrome.storage.local.get(function (storage) {
                chrome.tabs.query({
                    url: ["https://*/*", "http://*/*", "chrome://*/*", "file://*/*"],
                    highlighted: true,
                    currentWindow: true
                }, function (tabs) {
                    var tabsArr = tabs.filter(function (tab) {
                        return !tab.pinned;
                    });
                    let opts = storage.options
                    let openBackgroundAfterSendTab = "yes"
                    if (opts) {
                        openBackgroundAfterSendTab = opts.openBackgroundAfterSendTab || "yes"
                    }
                    if (tabsArr.length > 0) {
                        saveTabs(tabsArr);
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                        closeTabs(tabsArr);
                    } else {
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                    }

                });
            });
            break
        case 'showAllTabs':
            openBackgroundPage();
            break;
        case 'sendAllTabs':
            chrome.storage.local.get(function (storage) {
                let opts = storage.options
                let openBackgroundAfterSendTab = "yes"
                if (opts) {
                    openBackgroundAfterSendTab = opts.openBackgroundAfterSendTab || "yes"
                }
                chrome.tabs.query({
                    url: ["https://*/*", "http://*/*", "chrome://*/*", "file://*/*"], currentWindow: true
                }, function (tabs) {
                    var req = tabs.filter(function (tab) {
                        return !tab.pinned;
                    });
                    if (req.length > 0) {
                        saveTabs(req);
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                        closeTabs(req);
                    } else {
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                    }
                });
            });
            break;
        case 'sendLeftTabs':
            chrome.storage.local.get(function (storage) {
                let opts = storage.options
                let openBackgroundAfterSendTab = "yes"
                if (opts) {
                    openBackgroundAfterSendTab = opts.openBackgroundAfterSendTab || "yes"
                }
                chrome.tabs.query({
                    url: ["https://*/*", "http://*/*", "chrome://*/*", "file://*/*"], currentWindow: true
                }, function (tabs) {
                    var reqs = tabs.filter(function (tab) {
                        return !tab.pinned;
                    });
                    let req = []
                    for (let i = 0; i < reqs.length; i++) {
                        if (reqs[i].active) {
                            break;
                        }
                        req.push(reqs[i]);
                    }
                    if (req.length > 0) {
                        saveTabs(req);
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                        closeTabs(req);
                    } else {
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                    }
                });
            });
            break;
        case 'sendRightTabs':
            chrome.storage.local.get(function (storage) {
                let opts = storage.options
                let openBackgroundAfterSendTab = "yes"
                if (opts) {
                    openBackgroundAfterSendTab = opts.openBackgroundAfterSendTab || "yes"
                }
                chrome.tabs.query({
                    url: ["https://*/*", "http://*/*", "chrome://*/*", "file://*/*"], currentWindow: true
                }, function (tabs) {
                    let req = []
                    for (let i = tabs.length - 1; i >= 0; i--) {
                        if (tabs[i].active) {
                            break;
                        }
                        req.push(tabs[i]);
                    }
                    if (req.length > 0) {
                        saveTabs(req);
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                        closeTabs(req);
                    } else {
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                    }
                });
            });
            break;
        case 'sendOtherTabs':
            chrome.storage.local.get(function (storage) {
                let opts = storage.options
                let openBackgroundAfterSendTab = "yes"
                if (opts) {
                    openBackgroundAfterSendTab = opts.openBackgroundAfterSendTab || "yes"
                }
                chrome.tabs.query({
                    url: ["https://*/*", "http://*/*", "chrome://*/*", "file://*/*"],
                    highlighted: false,
                    currentWindow: true
                }, function (tabs) {
                    var req = tabs.filter(function (tab) {
                        return !tab.pinned;
                    });
                    if (req.length > 0) {
                        saveTabs(req);
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                        closeTabs(req);
                    } else {
                        if (openBackgroundAfterSendTab === "yes") {
                            openBackgroundPage();
                        } else {
                            reloadBackgroundPage()
                        }
                    }
                });
            });
            break;
        default:
            break;
    }
});

// 安全的数字操作类
class SafeNumberOperation {
    constructor() {
        this.lock = new Lock();
        this.value = 0;
    }

    // 安全+n
    async add(amount) {
        const unlock = await this.lock.acquire();

        try {
            this.value += amount;
            return this.value;
        } finally {
            unlock();
        }
    }

    // 安全-n
    async subtract(amount) {
        const unlock = await this.lock.acquire();

        try {
            this.value -= amount;
            return this.value;
        } finally {
            unlock();
        }
    }

    // 安全清零
    async subtractAll() {
        const unlock = await this.lock.acquire();

        try {
            const currentValue = this.value;
            this.value = 0;  // Subtracting all numbers
            return currentValue;
        } finally {
            unlock();
        }
    }

    // 获取当前值
    getValue() {
        return this.value;
    }
}

// 锁类
class Lock {
    constructor() {
        this.isLocked = false;
        this.waitQueue = [];
    }

    // 获取锁
    async acquire() {
        const acquirePromise = new Promise((resolve) => {
            const tryAcquire = () => {
                if (!this.isLocked) {
                    this.isLocked = true;
                    resolve(() => this.release());
                } else {
                    this.waitQueue.push(tryAcquire);
                }
            };

            tryAcquire();
        });

        return await acquirePromise;
    }

    // 释放锁
    release() {
        this.isLocked = false;

        if (this.waitQueue.length > 0) {
            const nextAcquire = this.waitQueue.shift();
            nextAcquire();
        }
    }
}

// new一个安全的数字操作类
const safeOperation = new SafeNumberOperation();

// 安全+1
async function add() {
    const result1 = await safeOperation.add(1);
    console.log('After adding 1:', result1);

    console.log('Current value:', safeOperation.getValue());
}

// 安全清零，清空storage连续变化导致的数字累加，并顺便推送到gist，相当于缓存了一部分后直接清空并推送
async function subtractAll() {
    const current = safeOperation.getValue();
    // console.log('Current value:', current);
    if (current > 0) {
        await safeOperation.subtractAll();
        console.log('Current value after subtracting all:', safeOperation.getValue());
    }
}

// 设置定时器
function setTimer(key, delay) {
    const nextAlarmTime = Date.now() + delay; // delay时间后触发，单位毫秒
    chrome.alarms.create(key, {when: nextAlarmTime});
}
