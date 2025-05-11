// 前端公共JavaScript代码，负责页面导航和与后端的交互
function showMessage(message, type = 'success') {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) {
        console.error("Message box element not found!");
        return;
    }
    messageBox.textContent = message;
    messageBox.className = type === 'error' ? 'error' : '';
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000);
}

function navigateTo(page) {
    window.location.href = page;
}