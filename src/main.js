class ListManager{

    Config = {
        MemberDataURL:'https://raw.githubusercontent.com/TeaPoweredCode/TheCultOfCreativity-TwitchPanel/refs/heads/config/TeamMembers.json',
        LiveCheckTime: 120 // seconds
    };

    Twitch = {
        APIBase: 'https://api.twitch.tv/helix',
        Header: {
            'Content-Type': 'application/json',
            'Client-ID': 'at7fvpj8ydz12n5xwv8wf98urit01s',
            Authorization: null,
        }
    };

    MemberInfo = null;
    LiveTimer = null;
    
    start(auth)
    {
        this.Twitch.Header.Authorization = `Extension ${auth.helixToken}`;

        this.GetMemberData().then((memberData) => {
            let twitchLogins = this.GetTwitchLogins(memberData);
            this.getTwitchUserData(twitchLogins).then((TwitchData) =>{  
                TwitchData.data.forEach((data) => {
                    let user = memberData.Users.find((User) => User.Links.Twitch.toLowerCase() == `https://www.twitch.tv/${data.login}`);
                    user.Twitch = {
                        "User":data,
                        "Stream":null  
                    }
                });

                this.MemberInfo = memberData;
                this.buildMemberList();
                this.startLiveCheck();
            });
          });
    }

    GetTwitchLogins(memberData){
        return memberData.Users.reduce((logins, member) => {             
            if (member.Links.Twitch) 
                logins.push(member.Links.Twitch.split('/').at(-1).toLowerCase());
            return logins;
        }, []);
    }

    GetMemberData() {
        return fetch(this.Config.MemberDataURL).then(res => res.json());
    }

    getTwitchUserData(twitchUsers){
        let params = twitchUsers.map(user => `login=${user}`).join('&');
        return fetch(`${this.Twitch.APIBase}/users?${params}`, {headers:this.Twitch.Header})
                .then(response => response.json())
    }

    getTwitchStreamData(twitchUsers){
        let params = twitchUsers.map(user => `user_login=${user}`).join('&');
        return fetch(`${this.Twitch.APIBase}/streams?${params}`, {headers:this.Twitch.Header})
                .then(response => response.json())
    }


    buildMemberList(){
        const template = document.getElementById("template").children[0];
        const teamList = document.getElementById("TeamList");

        this.MemberInfo.Users.forEach((user) => {
            if(user.Twitch){ // TODO if want none twitch people
                user.ListElement = this.createMemberItem(template.cloneNode(true),user);
                teamList.appendChild(user.ListElement);
            }
        });
    }

    createMemberItem(templateEl, user){
        templateEl.querySelector(".MemberName").textContent = user.Info.Name;
        templateEl.querySelector(".TwitchImageLink").href = user.Links.Twitch;
        templateEl.querySelector(".StreamerImage").src = user.Twitch.User.profile_image_url;

        for (const [linkType, url] of Object.entries(user.Links)) {
            let link = templateEl.querySelector(`.${linkType}Link`);
            if(url)
                link.href = url;
            else
                link.style.display = 'none';
        };

        return templateEl;
    }

    getListOrder(memberData)
    {
        let live = [];
        let nonLive = [];

        memberData.Users.forEach((user) =>{
            if(user.Twitch && user.Twitch.Stream)
                live.push(user.Info.Name);
            else
                nonLive.push(user.Info.Name);
        });

        return live.sort().concat(nonLive.sort());
    }


    startLiveCheck(){
        this.LiveCheck();
        this.LiveTimer = setInterval(()=>{this.LiveCheck()}, this.Config.LiveCheckTime * 1000);
    }

    LiveCheck(){
        let twitchLogins = this.GetTwitchLogins(this.MemberInfo);
        this.getTwitchStreamData(twitchLogins).then((TwitchData) =>{
            this.MemberInfo.Users.forEach((user) => {
                if(user.Twitch)
                    user.Twitch.Stream = TwitchData.data.find(stream => stream.user_login == user.Twitch.User.login);
            });

            let order = this.getListOrder(this.MemberInfo);
            this.MemberInfo.Users.forEach((user) => {
                if(user.ListElement){
                    user.ListElement.style.order = order.indexOf(user.Info.Name);
                    user.ListElement.querySelector('.StreamerLive').style.display = (user.Twitch && user.Twitch.Stream ? 'flex' : 'none');
                }
            });
        });
    }
}
