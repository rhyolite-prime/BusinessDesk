const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            hostelList: [],
            hostelDetailMap: {},
            detailsList: [],
            hostelId: null,
        }
    },
    uuid() {
        return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    },
    methods: {
        getSetupData() {
            axios.get('/SmMainSetups/ListAllHostels').then(response => {

                this.hostelList = response.data;
                this.detailsList = []; 
                this.hostelDetailMap = {};

                this.hostelList.forEach(hostel => {
                  hostel.hostelId = hostel.id;
                  if (hostel.details && Array.isArray(hostel.details)) {
                    hostel.details.forEach(detail => {
                      detail.hostelId = hostel.id; 
                      this.detailsList.push(detail);
                    });
                  }
                });
                
                this.dataTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get data.');

            });

        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                childGrid: {
                    dataSource: this.detailsList,
                    queryString: "hostelId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [
                        { field: "id", headerText: 'Id', visible: false, isPrimaryKey: true, },
                        { field: "hostelId", headerText: 'hostelId', visible: false, },
                        { field: "blockName", headerText: "Block Name", validationRules: { required: true, minlength: 1 }, width: 100 },
                    ],
                    endAdd: (args) => {
                        this.saveHostelDetail(args.data);
                    },
                    endEdit: (args) => {
                        this.updateHostelDetail(args.data);
                    },
                    endDelete: (args) => {
                        this.delHostelDetail(args.data.id);
                    }
                    
                },
                columns: [
                    { field: "id", headerText: "id", width: 15, visible: false, isPrimaryKey: true,  },
                    { field: "name", headerText: "Hostel Name", validationRules: { required: true, minlength: 1 }, width: 250},
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveHostel(args.data);
                },
                endEdit: (args) => {
                    this.updateHostel(args.data);
                },
                endDelete: (args) => {
                    this.delHostel(args.data.id);
                }
            });
        },

        saveHostelDetail(payload) {
            payload.id = this.uuid();

            if (!payload.hostelId) {
                payload.hostelId = this.hostelId;
            }

            this.detailsList.push(payload);

            const hostel = this.hostelList.find(h => h.id === payload.hostelId);
            if (hostel) this.updateHostel(hostel);
        },

        updateHostelDetail(payload) {
            const index = this.detailsList.findIndex(d => d.id === payload.id);
            if (index !== -1) {
                this.detailsList.splice(index, 1, { ...payload });
            }

           
            if (payload.hostelId) {
                const hostel = this.hostelList.find(h => h.id === payload.hostelId);
                if (hostel) this.updateHostel(hostel);
            }
            
        },

        delHostelDetail(id) {
            const index = this.detailsList.findIndex(d => d.id === id);
            if (index !== -1) {
                const hostelId = this.detailsList[index].hostelId;
                this.detailsList.splice(index, 1);
                
                const hostel = this.hostelList.find(h => h.id === hostelId);
                if (hostel) this.updateHostel(hostel);
            }
        },



        saveHostel(payload) {
            if (!payload.id) {
                payload.id = this.uuid(); 
            }

            payload.details = this.detailsList.filter(
                d => d.hostelId === payload.id
            );

            delete payload.tenantId;
        
            axios.post('/SmMainSetups/CreateHostel', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.hostelId = response.data.hostelId;
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to save data.');
            });
        },

        updateHostel(payload) {
            payload.details = this.detailsList.filter(
                d => d.hostelId === payload.id
            );
            axios.post('/SmMainSetups/UpdateHostel', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'data updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update data.');

            });
        },

        delHostel(id) {

            axios.get('/SmMainSetups/DeleteHostel?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'data deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete data.');

            });
        },
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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

    mounted() {
        this.getSetupData();

    },
});
app.mount('#app');