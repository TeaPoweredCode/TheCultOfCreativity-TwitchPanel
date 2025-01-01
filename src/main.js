class ListManager{

    MemberDataURL = 'https://raw.githubusercontent.com/TeaPoweredCode/TheCultOfCreativity-TwitchPanel/refs/heads/config/TeamMembers.json';
   
    TwitchAPIBase = 'https://api.twitch.tv/helix';
    TwitchHeader = {
        'Content-Type': 'application/json',
        'Client-ID': 'at7fvpj8ydz12n5xwv8wf98urit01s',
        Authorization: null,
    };

    MemberInfo = null;
    LiveTimer = null;
    LiveTimerInterval = 120; // seconds
    
    start(auth)
    {
        this.TwitchHeader.Authorization = `Extension ${auth.helixToken}`;

        this.GetMemberData().then((memberData) => {
            this.getTwitchUserData(memberData.Users.map(user => user.TwitchLogin)).then((TwitchData) =>{  
                
                document.getElementById("HeaderDiscord").href = memberData.Discord;

                this.MemberInfo = memberData.Users.reduce(
                    (prev,user) => {
                        let twitchLogin = user.TwitchLogin;
                        user.Twitch = `https://www.twitch.tv/${twitchLogin}`
                        delete user['TwitchLogin'];
                    return {...prev,[twitchLogin]:{
                        'Links': user,
                        'TwitchUser': TwitchData.data.find(twitchUser => twitchUser.login == twitchLogin),
                        'TwitchStreamData':false,
                        'ListElement':null,
                    }}
                    }, {}
                );
                this.buildMemberList();
                this.startLiveCheck();
            });
          });
    }


    GetMemberData() {
        return fetch(this.MemberDataURL).then(res => res.json());
    }

    getTwitchUserData(twitchUsers){
        let params = twitchUsers.map(user => `login=${user}`).join('&');
        return fetch(`${this.TwitchAPIBase}/users?${params}`, {headers:this.TwitchHeader})
                .then(response => response.json())
    }

    getTwitchStreamData(twitchUsers){
        let params = twitchUsers.map(user => `user_login=${user}`).join('&');
        return fetch(`${this.TwitchAPIBase}/streams?${params}`, {headers:this.TwitchHeader})
                .then(response => response.json())
    }


    buildMemberList(){
        const template = document.getElementById("template").children[0];
        const teamList = document.getElementById("TeamList");

        for (const [user, data] of Object.entries(this.MemberInfo)) {
            data.ListElement = this.createMemberItem(template.cloneNode(true),data);
            teamList.appendChild(data.ListElement);
        }
    }

    createMemberItem(templateEl, data){
        templateEl.querySelector(".MemberName").textContent = data.TwitchUser.display_name;
        templateEl.querySelector(".TwitchImageLink").href = data.Links.Twitch;
        templateEl.querySelector(".StreamerImage").src = data.TwitchUser.profile_image_url;

        for (const [linkType, url] of Object.entries(data.Links)) {
            let link = templateEl.querySelector(`.${linkType}Link`);
            if(url)
                link.href = url;
            else
                link.style.display = 'none';
        };

        return templateEl;
    }


    startLiveCheck(){
        this.LiveCheck();
        this.LiveTimer = setInterval(()=>{this.LiveCheck()}, this.LiveTimerInterval * 1000);
    }

    LiveCheck(){
        let twitchUsers = Object.keys(this.MemberInfo);
        this.getTwitchStreamData(twitchUsers).then((TwitchData) =>{
            for (const [user, data] of Object.entries(this.MemberInfo)) {
                data.TwitchStreamData = TwitchData.data.find(streamData => streamData.user_login == user);
                data.ListElement.querySelector('.StreamerLive').style.display = (data.TwitchStreamData ? 'flex' : 'none');
            }
        });
    }
}
