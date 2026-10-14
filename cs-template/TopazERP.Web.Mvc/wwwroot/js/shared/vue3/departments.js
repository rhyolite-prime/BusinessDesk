const app = Vue.createApp({

    data() {
        return {

            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            departmentList: [],
            departmentNameList: [],
            departmentHierachyList: [],
            name: '',
            parentId: ''
        };
    },

    methods: {

        getSetupData() {

            axios.get('/SharedResource/GetDepartments').then(response => {
                 
                this.parseHierachy(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get departments.');

            });
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    { field: "rawName", validationRules: { required: true, minlength: 1 }, headerText: "Department", width: 75, },
                    { field: "name", validationRules: { required: true, minlength: 1 }, headerText: "Parent Hierachy", width: 95, allowEditing: false },
                    { field: "parentId", visible: false, headerText: "parentId", width: 15, },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                endEdit: (args) => {

                    this.updateDepartment(args.data);
                },
                endDelete: (args) => {

                    this.delDepartment(args.data.id);
                },
            });

        },

        saveDepartment() {

            let payload = {};

            this.isLoading = true;

            payload.name = this.name;
            payload.parentId = this.emptyGuid;

            if (this.parentId) {
                payload.parentId = this.parentId;

            }

            axios.post('/SharedResource/CreateDepartment', payload).then(response => {

                this.getSetupData();
                this.name = '';
                this.isLoading = false;

                this.toastHandler('', 'Department saved.');
                this.clearForm();

            }).catch(err => {

                this.isLoading = false;

                this.toastHandler('error', 'Unable to save department.');

            });
        },

        updateDepartment(payload) {

            payload.name = payload.rawName;

            delete payload.rawName;

            axios.post('/SharedResource/UpdateDepartment', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Department updated.');
                this.clearForm();

            }).catch(err => {

                this.toastHandler('error', 'Unable to update department.');

            });
        },

        delDepartment(id) {

            axios.get('/SharedResource/DelDepartment?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Department deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete department.');

            });
        },

        parseHierachy(dataArr) {

            this.departmentList = dataArr;

            var departmentHierachyList = [];

            for (var i = 0; i < this.departmentList.length; i++) {

                this.getHierachyName(this.departmentList[i].id);

                var name = [...new Set(this.departmentNameList)].join().replace(/,/g, '/');

                departmentHierachyList.push({
                    name: name,
                    parentId: this.departmentList[i].parentId,
                    id: this.departmentList[i].id,
                    rawName: this.departmentList[i].name,
                    tenantId: this.departmentList[i].tenantId,
                });

                name = [];

                this.departmentNameList = [];

            }

            this.departmentHierachyList = departmentHierachyList;

            this.renderTable(departmentHierachyList);
             
        },

        getHierachyName(id) {

            var parentId;
            var returnName;
            this.departmentList.forEach(item => {

                if (item.id == id) {
                    parentId = item.parentId;
                    returnName = item.name;
                }

                this.departmentList.forEach(cc => {
                    if (cc.id == parentId) {
                        return (`${this.getHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.departmentNameList.push(returnName);

        },
        
        clearForm() {
                
                this.name = '';
                this.parentId = '';
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