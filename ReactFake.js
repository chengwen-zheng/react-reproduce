import ReactFakeDomHostConfig  from './dom-utils';

function ReactFake() {
    const TEXT_ELEMENT = 'TEXT_ELEMENT';

    // Component class
    class Component {
        constructor(props) {
            this.props = props || {};
            this.state = this.state || {}
        }

        setState(partialState) {
            scheduleUpdate(this, partialState);
        }
    }

    function createElement(type, config, ...args) {
        const props = Object.assign({}, config);
        const hasChildren = args.length > 0;
        const rawChildren = hasChildren ? [].concat(...args) : [];
        props.children = rawChildren
          .filter(c => c != null && c !== false)
          .map(c => (c instanceof Object ? c : createTextElement(c)));
        return { type, props };
    }

    function createTextElement(value) {
        return createElement(TEXT_ELEMENT, { nodeValue: value });
    }

    function createInstance(fiber) {
        const instance = new fiber.type(fiber.props);
        instance.__fiber = fiber;
        return instance;
    }

    // fiber分类
    const HOST_COMPONENT = 'host';
    const CLASS_COMPONENT = 'class';
    const HOST_ROOT = 'root';

    // 全局变量
    // updateQueue数组用来盛装要实施的更新
    // 每次调用render()或者scheduleUpdate()方法都会往updateQueue中增加一个更新操作。
    // 每个更新操作携带的信息都不相同，我们将会在接下来的resetNextUnitOfWork()方法中看到如何去实施这些更新
    const updateQueue = [];
    let nextUnitOfWork = null;
    let pendingCommit = null;

    function render(elements, containerDom) {
        updateQueue.push({
            from: HOST_ROOT,
            dom: containerDom,
            newProps: {
                children: elements
            }
        });
        requestIdleCallback(performWork);
    }

    function scheduleUpdate(instance, partialState) {
        updateQueue.push({
            from: CLASS_COMPONENT,
            instance,
            partialState
        });
        requestIdleCallback(performWork);
    }

    // performUnitOfWork()方法会贯穿于整棵fiber树的构建过程。
    function performUnitOfWork(wipFiber) {
        beginWork(wipFiber);
        if (wipFiber.child) {
            return wipFiber.child;
        }

        // 如果没有子元素，则寻找兄弟元素，DFC更新Fiber树
        let uow = wipFiber;
        while (uow) {
            completeWork(uow);
            if (uow.sibling) {
                return uow.sibling;
            }
            uow = uow.parent;
        }
    }

    // beginWork是fiber增加标签
    function beginWork(wipFiber) {
        if (wipFiber.tag == CLASS_COMPONENT) {
            updateClassComponent(wipFiber);
        } else {
            updateHostComponent(wipFiber);
        }
    }

    function updateHostComponent(wipFiber) {
        if (!wipFiber.stateNode) {
            wipFiber.stateNode = ReactFakeDomHostConfig.createDomElement(wipFiber);
        }

        const newChildElements = wipFiber.props.children;
        reconcileChildrenArray(wipFiber, newChildElements);
    }

    function updateClassComponent(wipFiber) {
        let instance = wipFiber.stateNode;
        if (instance == null) {
            instance = wipFiber.stateNode = createInstance(wipFiber);
        } else if (wipFiber.props == instance.props && !wipFiber.partialState) {
            cloneChildFibers(wipFiber);
            return;
        }
        instance.props = wipFiber.props;
        instance.state = Object.assign({}, instance.state, wipFiber.partialState);
        wipFiber.partialState = null;

        const newChildElements = wipFiber.stateNode.render();
        reconcileChildrenArray(wipFiber, newChildElements);
    }
    
    // 真正执行任务的是performUnitOfWork这个方法，我们的一致性校验算法也需要写到这个方法里面。
    // 这个方法会执行任务片并返回下次需要执行的任务片。
    function performWork(deadline) {
        workLoop(deadline);
        if (nextUnitOfWork || updateQueue.length > 0) {
            requestIdleCallback(performWork);
        }
    }

    // workLoop()会监视着deadline参数，如果deadline太短，方法内部会自动停止循环，
    // 并保持nextUnitOfWork不做改变，下次会继续执行这个任务。
    // performWork()中剩下的代码还会检查是否还有等待完成的任务，如果有，则会在浏览器空闲的时候再次调用自己。
    function workLoop() {
        // nextUnitOfWork指向的是下一次我们要运行的fiber,重新构建树
        if (!nextUnitOfWork) {
            resetNextUnitOfWork();
        }

        // DFC构建Fiber树。
        while (nextUnitOfWork) {
            nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        }
        if (pendingCommit) {
            commitAllWork(pendingCommit);
        }
    }


    // 在performUnitOfWork()中，当wipFiber没有子元素或者当所有子元素都被执行完毕后，我们就会调用completeWork()方法。
    function performUnitOfWork(wipFiber) {
        beginWork(wipFiber);
        if (wipFiber.child) {
            return wipFiber.child;
        }

        // 如果没有子元素，寻找兄弟元素。
        let uow = wipFiber;
        while (uow) {
            completeWork(uow);
            if (uow.sibling) {
                return uow.sibling;
            }
            uow = uow.parent;
        }
    }

    // resetUnitOfWork()方法会接收一个更新操作并将其转化为nextUnitOfWork（其实就是根fiber）。
    function resetNextUnitOfWork() {
        const update = updateQueue.shift();
        if (!update) {
            return;
        }

        // 将更新操作中携带的state复制给对应fiber
        // 通过setState()更新才会有partialState
        if (update.partialState) {
            update.instance.__fiber.partialState = update.partialState;
        }

        const root = update.from == HOST_ROOT ? update.dom._rootContainerFiber : getRoot(update.instance.__fiber);

        // 注意看，这时候fiber都是没有child属性，返回的是根节点的fiber。
        // 就是old tree的根节点
        nextUnitOfWork = {
            tag: HOST_ROOT,
            // 如果render()引起， stateNode从update.dom取值。否则从root.stateNode取值
            stateNode: update.dom || root.stateNode,
            // props同理
            props: update.newProps || root.props,
            alternate: root
        }
    }

    function getRoot(fiber) {
        let node = fiber;
        while (node.parent) {
            node = node.parent;
        }
        return node;
    }

    const PLACEMENT = 1;
    const DELETION = 2;
    const UPDATE = 3;

    function arrify(val) {
        return val == null ? null : Array.isArray(val) ? val : [val];
    }

    // reconcileChildrenArray()是一个比较核心的代码，fiber树的构建以及要对DOM实施的变化都会在这个方法里面完成
    function reconcileChildrenArray(wipFiber, newChildElements) {
        const elements = arrify(newChildElements);

        let index = 0;
        let oldFiber = wipFiber.alternate ? wipFiber.alternate.child : null;
        let newFiber = null;
        while (index < elements.length || oldFiber != null) {
            const prevFiber = newFiber;
            const element = index < elements.length && elements[index];
            const sameType = oldFiber && element && element.type === oldFiber.type;

            // 如果前后fiber类型一样，说明是一个更新操作
            if (sameType) {
                newFiber = {
                    type: oldFiber.type,
                    tag: oldFiber.tag,
                    stateNode: oldFiber.stateNode,
                    props: element.props,
                    parent: wipFiber,
                    alternate: oldFiber,
                    partialState: oldFiber.partialState,
                    effectTag: UPDATE
                };
            }
            // 如果前后fiber类型不一样,插入操作
            if (element && !sameType) {
                newFiber = {
                    type: element.type,
                    tag: typeof element.type === 'string' ? HOST_COMPONENT : CLASS_COMPONENT,
                    props: element.props,
                    parent: wipFiber,
                    effectTag: PLACEMENT
                }
            }

            if (oldFiber && !sameType) {
                oldFiber.effectTag = DELETION;
                wipFiber.effects = wipFiber.effects || [];
                wipFiber.effects.push(oldFiber);
            }

            if (oldFiber) {
                oldFiber = oldFiber.sibling;
            }

            if (index === 0) {
                wipFiber.child = newFiber;
            } else if (prevFiber && element) {
                prevFiber.sibling = newFiber;
            }

            index++;
        }
    }

    function cloneChildFibers(parentFiber) {
        const oldFiber = parentFiber.alternate;
        if (!oldFiber.child) {
            return
        }

        let oldChild = oldFiber.child;
        let prevChild = null;
        while (oldChild) {
            // 循环拷贝子元素
            const newChild = {
                type: oldChild.type,
                tag: oldChild.tag,
                stateNode: oldChild.stateNode,
                props: oldChild.props,
                partialState: oldChild.partialState,
                alternate: oldChild,
                parent: parentFiber
            };

            if(prevChild){
                prevChild.sibling = newChild;
            } else {
                parentFiber.child = newChild;
            }
            
            prevChild = newChild;
            oldChild = oldChild.sibling;
        }
    }

    function completeWork(fiber) {
        if (fiber.tag === CLASS_COMPONENT) {
            fiber.stateNode.__fiber = fiber;
        }

        // 每次更新都要重新构建一整颗fiber树;
        if (fiber.parent) {
            const childEffects = fiber.effects || [];
            const thisEffect = fiber.effectTag !== null ? [fiber] : [];
            const parentEffects = fiber.parent.effects || [];
            fiber.parent.effects = parentEffects.concat(childEffects, thisEffect);
        } else {
            pendingCommit = fiber;
        }
    }

    // commitAllWork 构建一个effcts列表.
    // 通过这样的effects列表，根fiber的efffects会包含所有带有effectTag的fiber。
    function commitAllWork(fiber) {
        fiber.effects.forEach(f => commitWork(f));
        // 根fiber节点对应的DOM节点有个__rootContainerFiber属性引用着根fiber
        fiber.stateNode._rootContainerFiber = fiber;
        nextUnitOfWork = null;
        pendingCommit = null;
    }

    function commitWork(fiber) {
        if (fiber.tag === HOST_ROOT) {
            return;
        }

        let domParentFiber = fiber.parent;
        // 寻找一个dom类型的祖先fiber(stateNode属性对应为原生DOM)
        while (domParentFiber.tag == CLASS_COMPONENT) {
            domParentFiber = domParentFiber.parent;
        }
        const domParent = domParentFiber.stateNode;
        // 有了DOM才好去调用DOM的那些方法去操作DOM
        if (fiber.effectTag === PLACEMENT && fiber.tag == HOST_COMPONENT) {
            domParent.appendChild(fiber.stateNode);
        } else if (fiber.effectTag === UPDATE) {
            ReactFakeDomHostConfig.updateDomProperties(fiber.stateNode, fiber.alternate.props, fiber.props)
        } else if (fiber.effectTag === DELETION) {
            commitDeletion(fiber, domParent);
        }
    }

    function commitDeletion(fiber, domParent) {
        let node = fiber;
        while (true) {
            if (node.tag == CLASS_COMPONENT) {
                node = node.child;
                continue;
            }
            domParent.removeChild(node.stateNode);
            // 如果node不等于fiber，并且没有兄弟节点，说明已经删除完毕
            while (node != fiber && !node.sibling) {
                node = node.parent; // 删除完毕后node重置为刚开始的值
            }
            if (node == fiber) {
                return;
            }
            node = node.sibling;
        }
    }

    return {
        createElement,
        render,
        Component
    }
}

export default ReactFake()