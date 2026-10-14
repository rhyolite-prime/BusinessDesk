Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

var vue = new Vue({
    el: '#app',
    components: {
        Multiselect: window.VueMultiselect.default
    },
    data: {

        isShimmerLoading: false,
        isLoading: false,
        modalTitle: 'Add Role',
        payload: {},
        userList: [],
        roleList: [],
        permissionList: [],
        id: null,
        tenantId: null,
        name: '',
        displayName: '',
        description: '',
        grantedPermissions: [],
        roles: [],
        pageNo: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        lowerBound: 0,
        upperBound: 0,
        permissionToAdd: null,
        openPermissionGroups: {},
       
    },
    validations() {

        return {

            name: {
                required
            },
            
            
        }


    },
    computed: {
        
        availablePermissions() {
            return this.permissionList.filter(p =>
                !this.grantedPermissions.some(gp => gp.name === p.name)
            );
        },

        groupedAvailablePermissions() {

            // Final structure:
            // {
            //   GroupName: {
            //     SubGroupName: [permissions]
            //   }
            // }
            const grouped = {};

            this.availablePermissions.forEach(perm => {

                // Split permission name by dot notation
                // Example: "User.Create" → ["User", "Create"]
                const parts = perm.name.split('.');

                // First part becomes the main group (e.g. "User")
                // Fallback to "Other" if missing
                const group = parts[0] || 'Other';

                // Second part becomes subgroup (e.g. "Create")
                // Fallback to "General" if missing
                const subGroup = parts[1] || 'General';

                // Ensure group object exists
                if (!grouped[group]) {
                    grouped[group] = {};
                }

                // Ensure subgroup array exists inside group
                if (!grouped[group][subGroup]) {
                    grouped[group][subGroup] = [];
                }

                // Push permission into correct group → subgroup bucket
                grouped[group][subGroup].push(perm);
            });

            return grouped;
        },

        groupedGrantedPermissions() {

            // Same grouping logic as availablePermissions
            // but applied to permissions already granted to the user/role
            const grouped = {};

            this.grantedPermissions.forEach(perm => {

                // Split permission name into group/subgroup
                const parts = perm.name.split('.');

                const group = parts[0] || 'Other';
                const subGroup = parts[1] || 'General';

                // Create group container if missing
                if (!grouped[group]) {
                    grouped[group] = {};
                }

                // Create subgroup container if missing
                if (!grouped[group][subGroup]) {
                    grouped[group][subGroup] = [];
                }

                // Add permission to grouped structure
                grouped[group][subGroup].push(perm);
            });

            return grouped;
        }
    },

    methods: {
        groupPermissions(list) {

            if (!Array.isArray(list)) {
                return {};
            }

            const groups = {};

            list.forEach(p => {
                if (!p || !p.name) return;

                const key = p.name.split('.')[0];

                if (!groups[key]) {
                    groups[key] = [];
                }

                groups[key].push(p);
            });

            return groups;
        },
        togglePermissionGroup(group, subGroup) {

            const key = `${group}_${subGroup}`;

            this.openPermissionGroups[key] = !this.openPermissionGroups[key];
        },
        addPermissionFromList(permission) {
            this.grantedPermissions.push(permission);
        },

        removePermissionFromList(permission) {
            this.grantedPermissions =
                this.grantedPermissions.filter(p => p.name !== permission.name);
        },


        saveRole() {

            this.$v.$touch();

            if (this.$v.$invalid) {

                for (let key in Object.keys(this.$v)) {

                    const input = Object.keys(this.$v)[key];

                    if (this.$v[input].$error) {

                        this.$refs[input].focus();

                        break;
                    }

                }

                return;
            }



            this.payload = {};
            this.isLoading = true;

            this.payload.name = this.name;
            this.payload.displayName = this.displayName;
            this.payload.description = this.description;

            this.payload.grantedPermissions = this.grantedPermissions.map(x=>x.name);


            if (this.id) {

                this.payload.id = this.id;

                axios.post('/Manage/UpdateRole', this.payload).then((response) => {

                    this.isLoading = false;
                    this.toastHandler('', 'Role updated.');
                    this.getRoles();
                    $("#addEditRole").modal('hide');
                    this.modalTitle = 'Add Role';

                }).catch((error) => {

                    this.isLoading = false;
                    this.toastHandler('error', 'Unable to update role.');
                    $("#addEditRole").modal('hide');

                });


            }
            else
            {
                axios.post('/Manage/AddRole', this.payload).then((response) => {

                    this.isLoading = false;
                    this.toastHandler('', 'Role created.');
                    this.getRoles();
                    $("#addEditRole").modal('hide');
                    this.modalTitle = 'Add Role';

                }).catch((error) => {

                    this.isLoading = false;
                    this.toastHandler('error', 'Unable to create role.');
                    $("#addEditRole").modal('hide');

                });
            }
 

        },

        getRolePermissions(roleName) {

            axios.get('/Manage/GetAllPermissionsForRole?roleName=' + roleName).then((response) => {

                this.grantedPermissions = response.data;

            }).catch((error) => {

                this.toastHandler('error', 'Unable to delete role.');

            });
        },

       /* addPermission() {
            if (this.permissionToAdd) {
                this.grantedPermissions.push(this.permissionToAdd);
                this.permissionToAdd = null;
            }
        },*/
        addPermission() {
            if (this.permissionToAdd) {
                this.grantedPermissions.push(this.permissionToAdd);
                this.permissionToAdd = null;

                this.$nextTick(() => {
                    this.$refs.permissionDropdown.activate(); 
                });
            }
        },

        removePermission(index) {
            this.grantedPermissions.splice(index, 1);
        },
        deleteRole(id) {

            axios.get('/Manage/DelRole?id=' + id).then((response) => {

                this.toastHandler('', 'Role deleted.');
                this.getRoles();


            }).catch((error) => {

                this.toastHandler('error', 'Unable to delete role.');

                console.log(error);
            });
        },

        initUpdate(roleInfo) {

            this.getRolePermissions(roleInfo.name);
            this.modalTitle = 'Role Details';
            this.name = roleInfo.name;
            this.displayName = roleInfo.displayName;
            this.description = roleInfo.description;

            this.id = roleInfo.id;
            $("#addEditRole").modal('show');
        },

        resetModal() {
            this.modalTitle = 'Add Role';
            this.id = null;
            this.name = '';
            this.displayName = '';
            this.description = '';
            this.grantedPermissions = [];
            this.permissionToAdd = null;
            // reset validation state
            if (this.$v) {
                this.$v.$reset();
            }
        },

        getRoles() {

            axios.get(`/Manage/GetRoles?pageNo=${this.pageNo}&pageSize=${this.pageSize}`).then((response) => {

                this.roleList = response.data.data;
                this.totalCount = response.data.totalCount;
                this.totalPages = response.data.totalPages;

                this.lowerBound = response.data.lowerBound;
                this.upperBound = response.data.upperBound;

            }).catch((error) => {

                console.log(error);
            });
        },
        
        getPermissions() {

            axios.get('/Manage/GetPermissions').then((response) => {

                response.data.forEach((v) => {

                    v.isSelected = false;

                });

                this.permissionList = response.data;

            }).catch((error) => {

                console.log(error);
            });
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
         
        this.getRoles();
        this.getPermissions();
    },
});