// ==UserScript==
// @name         PPInfra Prompt Auto-fill
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Auto-fill prompt from URL to textarea and trigger button
// @author       karminski
// @match        https://ppinfra.com/llm*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function simulateUserInput(element, value) {
        const reactProps = Object.keys(element).find(key => key.startsWith('__reactProps$'));
        console.log('React props key:', reactProps);

        if (reactProps) {
            const props = element[reactProps];
            console.log('Found React props:', props);

            // 创建一个更完整的合成事件对象
            const syntheticEvent = {
                target: {
                    value: value,
                    name: element.name,
                    id: element.id
                },
                currentTarget: element,
                preventDefault: () => { },
                stopPropagation: () => { },
                isTrusted: true,
                type: 'change',
                nativeEvent: new Event('change', { bubbles: true })
            };

            if (props.onChange) {
                console.log('Calling React onChange handler');
                props.onChange(syntheticEvent);
            }

            if (props.onInput) {
                console.log('Calling React onInput handler');
                syntheticEvent.type = 'input';
                syntheticEvent.nativeEvent = new Event('input', { bubbles: true });
                props.onInput(syntheticEvent);
            }
        }

        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function createSyntheticEvent(element, type) {
        return {
            target: element,
            currentTarget: element,
            preventDefault: () => { },
            stopPropagation: () => { },
            isPropagationStopped: () => false,
            isDefaultPrevented: () => false,
            nativeEvent: new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: window,
                detail: 1,
                screenX: 100,
                screenY: 100,
                clientX: 100,
                clientY: 100,
                ctrlKey: false,
                altKey: false,
                shiftKey: false,
                metaKey: false,
                button: 0,
                buttons: 1,
            }),
            isTrusted: true,
            type: type,
            timeStamp: Date.now(),
            persist: () => { }
        };
    }

    function triggerReactClick(button) {
        const reactProps = Object.keys(button).find(key => key.startsWith('__reactProps$'));
        console.log('Button React props key:', reactProps);

        if (reactProps) {
            const props = button[reactProps];
            console.log('Found button React props:', props);

            // 模拟完整的点击事件序列
            if (props.onMouseEnter) {
                console.log('Triggering mouse enter');
                props.onMouseEnter(createSyntheticEvent(button, 'mouseenter'));
            }

            if (props.onMouseDown) {
                console.log('Triggering mouse down');
                props.onMouseDown(createSyntheticEvent(button, 'mousedown'));
            }

            if (props.onClick) {
                console.log('Triggering click');
                const clickEvent = createSyntheticEvent(button, 'click');
                // 如果是链接，模拟其行为
                if (button.tagName.toLowerCase() === 'a' || props.href || props.target) {
                    clickEvent.button = 0;
                    clickEvent.buttons = 1;
                    clickEvent.detail = 1;
                }
                props.onClick(clickEvent);
            }

            if (props.onMouseUp) {
                console.log('Triggering mouse up');
                props.onMouseUp(createSyntheticEvent(button, 'mouseup'));
            }

            // 如果是表单提交按钮，尝试触发表单提交
            const form = button.closest('form');
            if (form) {
                console.log('Found form, triggering submit');
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }

            return true;
        }

        return false;
    }

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`Element ${selector} found`);
                    resolve(element);
                } else if (Date.now() - startTime >= timeout) {
                    console.log(`Timeout waiting for ${selector}`);
                    reject(new Error(`Timeout waiting for ${selector}`));
                } else {
                    setTimeout(checkElement, 100);
                }
            };

            checkElement();
        });
    }

    async function fillAndSubmit() {
        try {
            console.log('Starting fillAndSubmit');

            const urlParams = new URLSearchParams(window.location.search);
            const promptText = urlParams.get('prompt');

            if (!promptText) {
                console.log('No prompt parameter found');
                return;
            }

            console.log('Waiting for textarea...');
            const textarea = await waitForElement('textarea.grow');

            console.log('Simulating user input through React...');
            simulateUserInput(textarea, promptText);

            // 等待React状态更新
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Waiting for button to become enabled...');
            const submitButton = await waitForElement('.button_btn__6RzFY:not([disabled])');

            // 尝试按回车键
            console.log('Trying Enter key press...');
            textarea.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));

            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('Attempting to click button through React...');
            const usedReact = triggerReactClick(submitButton);
            console.log('Used React click handler:', usedReact);

        } catch (error) {
            console.error('Error in fillAndSubmit:', error);
        }
    }

    // 等待页面完全加载后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(fillAndSubmit, 1000);
        });
    } else {
        setTimeout(fillAndSubmit, 1000);
    }
})();
