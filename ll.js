class Node {
    constructor(value){
        this.value = value;
        this.next = null;
    }
}

class LinkedList{
    constructor(){
        this.head = null;
    }

    append(value){
        const newNode = new Node(value);
        if(!this.head){
            this.head = newNode;
            return;
        } 
        let temp = this.head;
        while(temp.next){
            temp = temp.next;
        }
        temp.next = newNode;
    }

    prepend(value){
        const newNode = new Node(value);
        newNode.next = this.head;
        this.head = newNode;
    }

    insertAfter(pos,value){
        let temp = this.head;
        while(temp && temp.value !== pos){
            temp=temp.next;
        }

        if(!temp){
            console.log('given position not found');
            return;
        }

        const newNode = new Node(value);
        newNode.next = temp.next;
        temp.next = newNode;
    }

    insertBefore(pos,value){
        if(!this.head){
            console.log('list emprty');
            return;
        }
        if(this.head.value === pos){
            this.prepend(value);
            return;
        }

        let temp = this.head;
        while(temp.next && temp.next.value !== pos){
            temp=temp.next;
        }
        if(!temp.next){
            console.log('pos not found');
            return;
        }

        let newNode = new Node(value);

        newNode.next = temp.next;
        temp.next = newNode;
    }

    print(){
        let temp = this.head;
        let result = '';
        while(temp){
            result += temp.value + ' -> ';
            temp=temp.next;
        }
        console.log(result+ 'null');

    }

    printReverse(){
        let temp = this.head;
        let stack = [];
        while(temp){
            stack.push(temp.value);
            temp=temp.next;
        }

        while(stack.length){
            process.stdout.write(stack.pop() + ' -> ')
        }
        console.log('null')
    }

    delete(value){
        if(!this.head){
            return;
        }
        if(this.head.value === value){
            this.head = this.head.next;
            return;
        }
        let temp = this.head;
        while(temp.next && temp.next.value !== value){
            temp = temp.next;
        }
        if(temp.next){
            temp.next = temp.next.next;
        }
    }

    convertToLL(array){
        array.forEach(element => {
            this.append(element);
        });
    }

    getMiddle(head){
        let slow = head;
        let fast = head;
        while (fast.next && fast.next.next){
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    mergeSort(head){
        if(!head || !head.next){
            return head;
        }
        let mid = this.getMiddle(head);
        let nextToMid = mid.next;
        mid.next = null;

        let left = this.mergeSort(head);
        let right = this.mergeSort(nextToMid);

        return this.merge(left,right);
    }

    merge(left,right){
        if(!left) return right;
        if(!right) return left;

        let result;
        if(left.value < right.value){
            result = left;
            result.next = this.merge(left.next,right);
        } else{
            result = right;
            result.next = this.merge(left,right.next)
        }
        return result;
    }

    sort(){
        this.head = this.mergeSort(this.head);
    }

}

let list = new LinkedList();
list.append(30);
list.append(10);
list.append(50);
list.append(20);
list.append(40);

console.log("Original List:");
list.print();

list.sort();
console.log("Sorted List:");
list.print();
