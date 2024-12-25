console.log("content_script is done!!");
let pageX;
let pageY;
let scrollTop;
let scrollLeft;
let autoHideTimeout;

document.addEventListener('DOMContentLoaded', function () {
    // 点击弹窗外部关闭弹窗
    $(document).click(function () {
        hidePopup();
    });

    // 持续获取鼠标所在坐标
    $(document).mousemove(function (e) {
        pageX = e.pageX;
        pageY = e.pageY;
        scrollTop = $(document).scrollTop();
        scrollLeft = $(document).scrollLeft();
        // console.log("x is " + pageX + ", y is " + pageY);
        // console.log("scrollTop is " + scrollTop + ", scrollLeft is " + scrollLeft);
        // console.log("x1 is " + parseInt(pageY - scrollTop) + ", y1 is " + parseInt(pageX - scrollLeft));

        // 获取弹窗元素
        let popup = document.getElementById('descDiv');
        if (popup) {
            // 鼠标悬停在弹窗上时保持显示
            popup.addEventListener('mouseenter', function () {
                clearTimeout(autoHideTimeout);
            });
            // 鼠标离开弹窗，触发自动关闭
            popup.addEventListener('mouseleave', function () {
                autoHidePopup();
            });
        }
    });

});


// 自动关闭弹窗
function autoHidePopup() {
    autoHideTimeout = setTimeout(() => {
        hidePopup()
    }, 3000);
}


// 关闭弹窗
function hidePopup() {
    // 获取弹窗元素
    let popup = document.getElementById('descDiv');
    if (popup) {
        popup.style.top = '-100px';
        setTimeout(() => {
            popup.remove();
            // flag = false;
        }, 400);
    }
}

// 主动发送消息给后台
function sendMessageToBackground(action, message) {
    chrome.runtime.sendMessage({action: action, message: message}, function (res) {
        if (res === 'ok') {
            console.log("content-->background发送的消息被消费了");
        }
    });
}

// 持续监听发送给contentscript的消息
chrome.runtime.onMessage.addListener(function (req, sender, sendRes) {
    switch (req.action) {
        case 'translateResult':
            sendRes('ok'); // acknowledge
            if (req.message.trim().length > 0) {
                tip(req.message);
            }
            break;
        default:
            sendRes('nope'); // acknowledge
            break;
    }
});

// 简单的消息通知
function tip(info) {
    info = info || '';
    let ele = document.createElement('div');
    ele.id = 'descDiv';
    ele.className = 'chrome-plugin-simple-tip';
    ele.style.top = parseInt(pageY - scrollTop) + 20 + 'px';
    ele.style.left = pageX + 'px';
    ele.innerHTML = `<div>${info}</div>`;
    document.body.appendChild(ele);
    autoHidePopup()
}
