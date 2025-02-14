class ListManager{

    Config = {
        MemberDataURL:'https://raw.githubusercontent.com/TeaPoweredCode/TheCultOfCreativity-TwitchPanel/refs/heads/config/TeamMembers.json',
        LiveCheckTime: 120, // seconds
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

        this.getMemberData().then((memberData) => {                            
            document.getElementById("HeaderDiscord").href = memberData.Discord;

            let twitchLogins = this.getTwitchLogins(memberData);
            this.getTwitchUserData(twitchLogins).then((TwitchData) => {  
                TwitchData.data.forEach((data) => {
                    let user = memberData.Users.find((User) => User.Links.Twitch.toLowerCase() == `https://www.twitch.tv/${data.login}`);
                    user.Twitch = {
                        "User":data,
                        "Stream":null  
                    };
                });

                this.MemberInfo = memberData;
                this.buildMemberList();
                this.startLiveCheck();

                window.Twitch.ext.actions.onFollow((didFollow,channelName)=> {
                    this.onFollow(didFollow,channelName);
                }); 
            });
        });
    }

    getTwitchLogins(memberData){
        return memberData.Users.reduce((logins, member) => {             
            if (member.Links.Twitch) 
                logins.push(member.Links.Twitch.split('/').at(-1).toLowerCase());
            return logins;
        }, []);
    }

    getMemberData() {
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

    getViewerFollowed(viewerID){
        return fetch(`${this.Twitch.APIBase}/followed?user_id=${viewerID}`, {headers:this.Twitch.Header})
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

        let twitchFollow = templateEl.querySelector(".TwitchFollow");
        twitchFollow.querySelector('input[type=checkbox]').id = `${user.Twitch.User.login}TwitchFollow`;
        twitchFollow.querySelector('input[type=checkbox]').value = user.Twitch.User.login;

        twitchFollow.querySelector('label').htmlFor = `${user.Twitch.User.login}TwitchFollow`;

        if(user.Twitch){
            templateEl.querySelector(".TwitchFollow").onclick = (e)=>{
                e.preventDefault();
                e.stopPropagation();
            
                this.followChannelClick(user.Twitch.User.login);
            };
        }
        else
            templateEl.querySelector(".twitchFollow").style.display = 'none';

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
        this.liveCheck();
        this.LiveTimer = setInterval(()=>{this.liveCheck()}, this.Config.LiveCheckTime * 1000);
    }

    liveCheck(){
        let twitchLogins = this.getTwitchLogins(this.MemberInfo);
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

    followChannelClick(channelId)
    {
        window.Twitch.ext.actions.followChannel(channelId);
    }

    onFollow(didFollow, channelName)
    {        
        if(didFollow)
        {
            let user = this.MemberInfo.Users.find((member) => member.Twitch.User.login == channelName);
            if(user){
                user.ListElement.querySelector('.twitchFollow input[type="checkbox"]').checked = true;
            }
        }
    }
}
