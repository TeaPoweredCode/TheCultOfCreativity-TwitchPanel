class ListManager{

    MemberDataURL = 'https://raw.githubusercontent.com/TeaPoweredCode/TheCultOfCreativity-TwitchPanel/refs/heads/config/TeamMembers.json';
   
    TwitchAPIBase = 'https://api.twitch.tv/helix';
    TwitchHeader = {
        'Content-Type': 'application/json',
        'Client-ID': 'at7fvpj8ydz12n5xwv8wf98urit01s',
        Authorization: null,
    };

    MemberInfo = null;
    
    start(auth)
    {
        this.TwitchHeader.Authorization = `Extension ${auth.helixToken}`;

        this.GetMemberData().then((memberData) => {
            this.getTwitchUserData(memberData,auth).then((TwitchData) =>{  
                
                document.getElementById("HeaderDiscord").href = memberData.Discord;

                this.MemberInfo = memberData.Users.reduce(
                    (prev,user) => {
                        let twitchLogin = user.TwitchLogin;
                        user.Twitch = `https://www.twitch.tv/${twitchLogin}`
                        delete user['TwitchLogin'];
                    return {...prev,[twitchLogin]:{
                        'Links': user,
                        'TwitchUser': TwitchData.data.find(twitchUser => twitchUser.login == twitchLogin),
                        'TwitchLive':false,
                    }}
                    }, {}
                );
                this.buildMemberList();
            });
          });
    }


    GetMemberData() {
        return fetch(this.MemberDataURL).then(res => res.json());
    }

    getTwitchUserData(memberData){        
        let twitchMembers = memberData.Users.map(user => user.TwitchLogin);
        let params = twitchMembers.map(user => `login=${user}`).join('&');

        return fetch(`${this.TwitchAPIBase}/users?${params}`, {headers:this.TwitchHeader})
                .then(response => response.json())
    }

    buildMemberList(){
        const template = document.getElementById("template").children[0];
        const teamList = document.getElementById("TeamList");

        for (const [user, data] of Object.entries(this.MemberInfo)) {
            let memberItem = this.createMemberItem(template.cloneNode(true),data);
            teamList.appendChild(memberItem);
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
}
