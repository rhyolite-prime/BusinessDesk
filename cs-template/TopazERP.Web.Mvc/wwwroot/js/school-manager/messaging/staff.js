
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        recipientList: [],
        seletedStaffList: [],
        subject: '',
        messagingChannel: 'sms',
        message: ''
    },

    methods: {

        getStaff() {

            axios.get('/Staff/GetStaff').then(response => {
                 
                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get staff.');

            });
        },


        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search, ej.Grid.ToolBarItems.Print] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 20 },
                    { field: "staffIdentifier", headerText: "Staff ID", width: 55, },
                    { field: "lastName", headerText: "Last Name", width: 55, },
                    { field: "firstName", headerText: "First Name", width: 55, },
                    { field: "otherName", headerText: "Other Name", width: 55, },
                    { field: "maritalStatus", headerText: "Marital Status", width: 55, },
                    { field: "emailAddress", headerText: "Email", width: 65, },
                    { field: "primaryPhone", headerText: "Phone No", width: 65, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ]
                
            });

        },

        sendMessage() {

            this.isLoading = true;

            this.setRecipientsData();

            this.seletedStaffList.forEach((v) => {
                
                this.recipientList.push(v.id);

            });

            this.payload = {};
            this.payload.subject = this.subject;
            this.payload.messagingChannel = this.messagingChannel;
            this.payload.message = this.message;
            this.payload.recipients = this.recipientList;
            this.payload.recipientType = 'staff';

            console.log(this.payload);

            axios.post('/SchMessaging/SendBulkMessage', this.payload).then(response => {

                this.isLoading = false;

                this.toastHandler('', 'Messages sent.');

            }).catch(err => {

                this.isLoading = false;

                this.toastHandler('error', 'Unable to send message.');

            });

        },
        setRecipientsData() {
 
            var obj = $("#dataTable").ejGrid("instance"), rec = []; seletedStaffList = [];
             var check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
             if (check.length) {
                 for (var pageInx = 0; pageInx < check.length; pageInx++) {
                     if (!ej.isNullOrUndefined(check[pageInx]))
                         rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                 }
             }

            this.seletedStaffList = rec;

          },

        getRecords(pageInx, inx, proxy, rec) {

            if (inx.length) {
                for (var i = 0; i < inx.length; i++) {
                    var pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    var data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;

        },

        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {

                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }

        },

        
    },

    created() {

        this.getStaff();

    },
});